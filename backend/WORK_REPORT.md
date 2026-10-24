# DevFlow Backend — Work Report

## Task 1: Backend Foundation Fixes

### 1. Task Objective
Stabilize and correct the backend foundation, configuration, and runtime environment of DevFlow without implementing business logic, models, controllers, services, or API endpoints. Ensure proper ES module environment variable loading order, robust MongoDB connection options handling, correct directory casing and imports, resilient static asset resolution, appropriate package.json scripts and dependency classification, and graceful database error handling.

---

### 2. Initial Problems Discovered
Upon inspection of the codebase prior to making changes, the following specific issues were verified:

1. **ES Module Hoisting & Environment Loading Order (`src/index.js` & `src/app.js`):**
   - `src/index.js` imported `src/app.js` before executing `dotenv.config({ path: './.env' })`.
   - In ES Modules, static `import` declarations are evaluated before top-level code. Consequently, `src/app.js` evaluated `process.env.DEV_URL` while `process.env` had not yet been populated.
   - `DEV_URL` was also missing from `backend/.env`.
   - This caused `allowedOrigin` in CORS to evaluate to `[undefined]`, which would block all frontend client requests.
2. **Missing Port Fallback (`src/index.js`):**
   - `const PORT = process.env.PORT` had no fallback, risking server startup failure or ephemeral port assignment if `PORT` was unset.
3. **MongoDB Connection String Fragility & Missing Option Configuration (`src/DB/index.js`):**
   - The connection string was constructed via string concatenation: ``${process.env.MONGO_DB_URI}/${DB_NAME}``.
   - `MONGO_DB_URI` in `.env` ended with a trailing slash (`/`), resulting in double slashes (`...//devflow`).
   - Standard MongoDB Atlas query parameters (e.g. `?retryWrites=true&w=majority`) would be corrupted by appending `/${DB_NAME}` directly to the string.
4. **Flawed Database Error Lifecycle (`src/DB/index.js` & `src/index.js`):**
   - `src/DB/index.js` caught connection errors and executed `process.exit(1)` inside the helper function, swallowing the error and preventing the `.catch()` block in `src/index.js` from executing.
5. **Inconsistent Directory Casing (`src/DB/` vs lowercase siblings):**
   - `src/DB/` used uppercase naming while `controllers/`, `middlewares/`, `models/`, `routes/`, and `utils/` used lowercase. On case-sensitive operating systems (Linux/Docker), this causes module resolution crashes.
6. **Fragile Static Path Resolution (`src/app.js`):**
   - `app.use(express.static("public"))` relied on `process.cwd()`. Running the server from any working directory other than `backend/` broke static asset resolution.
7. **Unused Import (`src/app.js`):**
   - Line 1 imported `{ urlencoded }` from `"express"`, but line 19 used `express.urlencoded(...)`.
8. **Package Configuration Flaws (`backend/package.json`):**
   - `"main"` pointed to `"index.js"` instead of `"src/index.js"`.
   - Missing `"start": "node src/index.js"` production execution script.
   - `"nodemon"` was placed under `"dependencies"` rather than `"devDependencies"`.
9. **Missing Environment Template:**
   - No `.env.example` existed to document required environment variables.

---

### 3. Files Inspected
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env`
- `backend/.gitignore`
- `backend/src/index.js`
- `backend/src/app.js`
- `backend/src/constants.js`
- `backend/src/DB/index.js`
- `backend/src/controllers/` (directory)
- `backend/src/middlewares/` (directory)
- `backend/src/models/` (directory)
- `backend/src/routes/` (directory)
- `backend/src/utils/` (directory)
- `backend/public/temp/.gitkeep`
- `frontend/package.json` (verified decoupled structure)

---

### 4. Files Created
- `backend/.env.example` (Template documenting `PORT`, `MONGO_DB_URI`, and `DEV_URL` without exposing secrets)
- `backend/WORK_REPORT.md` (This technical work report)

---

### 5. Files Modified
- `backend/src/DB/index.js` $\rightarrow$ renamed to `backend/src/db/index.js` via Git
- `backend/src/db/index.js`
- `backend/src/index.js`
- `backend/src/app.js`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env`

---

### 6. Changes Made and Why

#### A. Environment Loading Order & CORS Fallback
- **Files:** `backend/src/index.js`, `backend/src/app.js`, `backend/.env`
- **Change:**
  - In `src/index.js`, replaced procedural `dotenv.config(...)` with `import "dotenv/config";` as the first line of the module.
  - In `src/app.js`, added fallback origin: `const allowedOrigin = [process.env.DEV_URL || "http://localhost:5173"];`.
  - Added `DEV_URL=http://localhost:5173` to `backend/.env`.
- **Rationale:**
  ES module import statements are hoisted and evaluated before top-level code. Using `import "dotenv/config";` forces Node's ESM loader to execute environment loading prior to evaluating subsequent imports (`./db/index.js` and `./app.js`). Providing a default origin fallback ensures CORS never initializes with `[undefined]`.

#### B. MongoDB Connection Configuration & Error Handling
- **Files:** `backend/src/db/index.js`, `backend/src/index.js`
- **Change:**
  - Replaced string concatenation with Mongoose option `{ dbName: DB_NAME }`.
  - Added explicit check to verify `process.env.MONGO_DB_URI` exists before attempting connection.
  - Changed error handling in `connectDB` to log the failure and re-throw (`throw error;`).
  - In `src/index.js`, updated the promise chain so `app.listen()` only executes upon resolution, and the `.catch()` block logs and terminates the process with `process.exit(1)`.
- **Rationale:**
  Passing `{ dbName: DB_NAME }` ensures database names are assigned cleanly without corrupting Atlas connection URIs regardless of trailing slashes or URL query parameters. Rethrowing the error allows `index.js` to manage the process lifecycle cleanly without starting the HTTP server on database failure.

#### C. Directory Casing Normalization
- **Files:** `backend/src/DB/` $\rightarrow$ `backend/src/db/`, `backend/src/index.js`
- **Change:**
  - Renamed `backend/src/DB/index.js` to `backend/src/db/index.js` using a Git-safe two-step move.
  - Updated import in `src/index.js` to `import { connectDB } from "./db/index.js";`.
- **Rationale:**
  Ensures consistent lowercase naming across all `src/` directories (`controllers`, `db`, `middlewares`, `models`, `routes`, `utils`), preventing fatal module resolution errors on case-sensitive Linux deployment environments.

#### D. Reliable Static Asset Path Resolution
- **Files:** `backend/src/app.js`
- **Change:**
  - Resolved `public` directory path using `path.join(__dirname, "../public")` with `fileURLToPath(import.meta.url)`.
  - Removed unused `{ urlencoded }` import from `express`.
- **Rationale:**
  Ensures static assets resolve accurately regardless of the terminal's working directory (`process.cwd()`) when launching the application.

#### E. Package Configuration & Dependency Placement
- **Files:** `backend/package.json`, `backend/package-lock.json`
- **Change:**
  - Corrected `"main"` from `"index.js"` to `"src/index.js"`.
  - Added `"start": "node src/index.js"` production script.
  - Preserved `"dev": "nodemon src/index.js"` development script.
  - Moved `"nodemon": "^3.1.14"` from `"dependencies"` into `"devDependencies"`.
  - Preserved all other dependency versions (`express: ^5.3.0`, `mongoose: ^9.11.4`, `dotenv: ^18.0.9`, `cors: ^2.8.6`, `cookie-parser: ^1.4.7`).
  - Ran `npm install` in `backend/` to update `package-lock.json`.
- **Rationale:**
  Ensures standard production runners can execute `npm start`, points entry to the actual file, and prevents developer tooling from leaking into production runtime dependencies.

---

### 7. Dependencies Added, Removed, or Changed

| Package | Previous Location | New Location | Version | Action |
| :--- | :--- | :--- | :--- | :--- |
| `nodemon` | `dependencies` | `devDependencies` | `^3.1.14` | Reclassified to development dependencies |
| `cookie-parser` | `dependencies` | `dependencies` | `^1.4.7` | Preserved unchanged |
| `cors` | `dependencies` | `dependencies` | `^2.8.6` | Preserved unchanged |
| `dotenv` | `dependencies` | `dependencies` | `^18.0.9` | Preserved unchanged |
| `express` | `dependencies` | `dependencies` | `^5.3.0` | Preserved unchanged |
| `mongoose` | `dependencies` | `dependencies` | `^9.11.4` | Preserved unchanged |

*No new packages were installed. No packages were upgraded or removed from the tree.*

---

### 8. Commands Executed

1. `git status` — Verified repository state, branch, and staged files.
2. `git mv backend/src/DB backend/src/db_temp; git mv backend/src/db_temp backend/src/db` — Safely renamed directory on Windows filesystem while staging in Git.
3. `npm install` (in `backend/`) — Updated `package-lock.json` to reflect devDependencies change.
4. `npm run` (in `backend/`) — Verified available npm scripts (`start`, `dev`, `test`).
5. `node --check src/index.js; node --check src/app.js; node --check src/db/index.js; node --check src/constants.js` — Validated syntax of all backend JavaScript files.
6. `node --input-type=module -e "import { app } ..."` — Verified ES module resolution of all internal imports.
7. `node --input-type=module -e "import 'dotenv/config'; ..."` — Verified environment variable loading order and CORS origin resolution.
8. `node --input-type=module -e "/* test missing MONGO_DB_URI */"` — Verified missing URI error throwing and error handling.
9. `node --input-type=module -e "/* test ECONNREFUSED with invalid URI */"` — Verified that database failures are caught and prevent the server from starting.
10. `node src/index.js` (background task) — Tested real server boot and actual MongoDB Atlas connection.
11. `node -e "fetch('http://localhost:8000')..."` — Tested HTTP response from live running server (returned `404 Not Found` as expected with 0 mounted routes).
12. `git diff` — Inspected exact code diffs across all modified files.

---

### 9. Validation Results

#### A. Successfully Completed Changes
- [x] ES module environment variable loading order resolved via `import "dotenv/config";`.
- [x] Sensible `PORT` fallback (`process.env.PORT || 8000`) implemented.
- [x] CORS origin fallback (`process.env.DEV_URL || "http://localhost:5173"`) implemented.
- [x] `DEV_URL` configured in `backend/.env`.
- [x] `backend/.env.example` created.
- [x] Database name configured via Mongoose `{ dbName: DB_NAME }` option rather than string concatenation.
- [x] MongoDB connection error handling updated to rethrow and exit cleanly in `src/index.js`.
- [x] Directory casing normalized from `src/DB/` to `src/db/` and tracked in Git.
- [x] Imports updated to match lowercase `src/db/index.js`.
- [x] Static files path made independent of CWD using `path.join(__dirname, "../public")`.
- [x] Unused `{ urlencoded }` import removed from `src/app.js`.
- [x] `package.json` entry point corrected to `src/index.js`.
- [x] `package.json` production `"start"` script added.
- [x] `nodemon` moved to `devDependencies` in `package.json` and `package-lock.json`.
- [x] Preserved all frontend files completely untouched.

#### B. Checks that Passed
- **Syntax Check:** `node --check` passed for all backend files without syntax errors.
- **Module Resolution Check:** All internal module imports (`app.js`, `db/index.js`, `constants.js`) resolved cleanly.
- **Environment Order Check:** Verified `process.env.PORT` and `process.env.DEV_URL` are accessible during module evaluation.
- **Missing URI Validation Check:** Verified `connectDB` throws `"MONGO_DB_URI is not defined in environment variables"` when URI is missing.
- **Connection Failure Handling Check:** Verified that upon an invalid host or unreachable database, `connectDB` catches the error, rethrows, `index.js` catches it, and the application does not start listening or pretend to be ready.
- **Live MongoDB Atlas Connection Check:** Verified actual successful connection to MongoDB Atlas host (`ac-vby5dem-shard-00-01.zab9c3k.mongodb.net`) and server listening on Port 8000.
- **Live HTTP Response Check:** Verified that `fetch("http://localhost:8000")` receives an Express `404 Not Found` response, proving the server and middleware stack are fully functional.
- **Frontend Non-Regression Check:** `git status` confirms zero modifications to `frontend/`.

#### C. Checks that were Not Performed
- **End-to-End API Route Tests:** Not performed because no API routes exist yet (out of scope for Task 1).
- **Automated Unit / Integration Tests (`npm test`):** Not performed because test frameworks/suites are not yet implemented in the repository.

---

### 10. Issues that Could Not Be Resolved
*None within the scope of Task 1.* All targeted foundation defects (casing, hoisting, static path, connection options, scripts, and devDependencies) were successfully diagnosed and resolved.

---

### 11. Remaining Risks
1. **Authentication Dependencies Missing:**
   `bcrypt` (or `bcryptjs`) and `jsonwebtoken` are not yet installed. User authentication cannot be implemented until these packages are added in the next task.
2. **Missing Architectural Layer (`services/`):**
   `backend/src/services/` does not yet exist. Business logic must be placed into services once implemented rather than bloating controllers.
3. **Absence of Centralized Error Handling:**
   `ApiError`, `ApiResponse`, and global Express error middleware `(err, req, res, next)` have not yet been created. Any unhandled controller errors in future tasks will default to HTML error responses until this infrastructure is built.
4. **Root Git Configuration:**
   The repository root lacks a `.gitignore`. While `backend/.gitignore` protects backend secrets, root-level operations must be handled with care.

---

### 12. Recommended Next Task
**Task 2: Core Infrastructure, Utilities, and Authentication Domain Scaffold**
1. Install required authentication and validation packages (`bcrypt`, `jsonwebtoken`, `zod`).
2. Create `backend/src/services/` directory.
3. Create foundational utilities: `ApiError.js`, `ApiResponse.js`, and `asyncHandler.js` in `backend/src/utils/`.
4. Create centralized error-handling middleware in `backend/src/middlewares/error.middleware.js` and wire it to `src/app.js`.
5. Scaffold the User model (`src/models/user.model.js`) with bcrypt password hashing hooks and JWT token generation methods.

---

## Task 2: Core Infrastructure and Error Handling

### 1. Task Objective
Implement the foundational shared utilities and error-handling middleware required across the DevFlow backend. Establish uniform API error representations (`ApiError`), standard success response structures (`ApiResponse`), an asynchronous controller wrapper (`asyncHandler`), a centralized Express error handler (`errorHandler`), and an unknown route handler (`notFoundHandler`). Integrate and order these components within `src/app.js` without implementing business domains or API endpoints.

---

### 2. Initial Project State
- Foundation fixes from Task 1 were verified intact:
  - `import "dotenv/config";` correctly loaded environment variables at module entry.
  - Lowercase `src/db/` directory casing was preserved.
  - Port fallback (`8000`) and CORS fallback (`http://localhost:5173`) were active.
  - MongoDB connection using `{ dbName: DB_NAME }` was verified and functional.
- Prior to Task 2, `backend/src/utils/` and `backend/src/middlewares/` were completely empty (0 files).
- Requests to unhandled routes resulted in standard Express HTML error pages rather than JSON responses.
- No structured error or response classes existed.

---

### 3. Files Inspected
- `backend/src/app.js` (middleware pipeline)
- `backend/src/index.js` (server entry point)
- `backend/src/constants.js` (constants)
- `backend/src/utils/` (empty directory)
- `backend/src/middlewares/` (empty directory)
- `backend/package.json` (dependencies and scripts)
- `backend/WORK_REPORT.md` (Task 1 documentation)

---

### 4. Files Created
- `backend/src/utils/ApiError.js` — Custom error class extending `Error` for operational and HTTP errors.
- `backend/src/utils/ApiResponse.js` — Standard response wrapper class formatting JSON API outputs.
- `backend/src/utils/asyncHandler.js` — Higher-order middleware wrapper forwarding rejected promises to `next(err)`.
- `backend/src/middlewares/error.middleware.js` — Centralized 4-parameter Express error handler formatting JSON error outputs.
- `backend/src/middlewares/notFound.middleware.js` — 404 handler capturing unmatched route requests and generating `ApiError(404)`.

---

### 5. Files Modified
- `backend/src/app.js` — Imported and registered `notFoundHandler` and `errorHandler` at the end of the middleware stack.

*(Note: No other existing files were modified.)*

---

### 6. Implementation Details

#### A. `ApiError` Class (`src/utils/ApiError.js`)
- Extends JavaScript's native `Error`.
- Properties:
  - `statusCode`: HTTP status code integer (e.g., 400, 401, 403, 404, 500).
  - `message`: Human-readable error description (default: `"Something went wrong"`).
  - `errors`: Array containing detailed validation errors or diagnostic context (default: `[]`).
  - `data`: Initialized to `null`.
  - `success`: Always `false`.
  - `isOperational`: Set to `true` to distinguish operational errors from programmer bugs.
  - `name`: Explicitly set to `"ApiError"`.
  - `stack`: Preserves passed stack or captures stack trace via `Error.captureStackTrace(this, this.constructor)`.

#### B. `ApiResponse` Class (`src/utils/ApiResponse.js`)
- Standardized payload format for all future successful controller responses.
- Properties:
  - `statusCode`: HTTP status code integer (e.g., 200, 201).
  - `data`: Response data payload.
  - `message`: Descriptive success message (default: `"Success"`).
  - `success`: Boolean derived dynamically (`statusCode < 400`).

#### C. `asyncHandler` Wrapper (`src/utils/asyncHandler.js`)
- Higher-order function taking an asynchronous Express controller `(req, res, next)`.
- Wraps execution in `Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))`.
- Eliminates repetitive `try/catch` boilerplate across all future route controllers.

#### D. Centralized Error Middleware (`src/middlewares/error.middleware.js`)
- Express 4-parameter signature: `(err, req, res, next)`.
- If the incoming error is not an `ApiError` (e.g. standard runtime `Error`, Mongoose error, JSON parsing error), it converts it into an `ApiError` with fallback status `500` and message `"Internal Server Error"`.
- Response structure:
  ```json
  {
    "statusCode": 404,
    "success": false,
    "message": "Route not found: GET /unknown",
    "errors": []
  }
  ```
- Environment awareness: Attaches `stack` to the JSON response only when `process.env.NODE_ENV !== "production"`. When in production, stack traces are withheld to prevent security leakage.
- Returns `res.status(error.statusCode).json(response)` safely without crashing the server.

#### E. 404 Not Found Middleware (`src/middlewares/notFound.middleware.js`)
- Catches any request that passes through the entire middleware and router pipeline without matching a route.
- Constructs an `ApiError(404, "Route not found: <METHOD> <URL>")` and passes it to `next(error)`.
- By delegating to `next(error)`, the response is formatted uniformly by `errorHandler`.

---

### 7. Middleware Registration Order
In `backend/src/app.js`, middlewares are registered in the following strict order:

1. **CORS Middleware:** `cors({ origin: allowedOrigin, credentials: true })`
2. **JSON Body Parser:** `express.json({ limit: "16kb" })`
3. **URL-Encoded Body Parser:** `express.urlencoded({ extended: true, limit: "16kb" })`
4. **Static File Server:** `express.static(path.join(__dirname, "../public"))`
5. **Cookie Parser:** `cookieParser()`
6. *(Mount point for future API route modules)*
7. **404 Not Found Handler:** `app.use(notFoundHandler)` — Must be registered after all route declarations.
8. **Centralized Error Handler:** `app.use(errorHandler)` — Must be registered as the terminal middleware in the application.

---

### 8. Commands Executed

1. `node --check src/index.js; node --check src/app.js; node --check src/utils/ApiError.js; node --check src/utils/ApiResponse.js; node --check src/utils/asyncHandler.js; node --check src/middlewares/error.middleware.js; node --check src/middlewares/notFound.middleware.js` — Validated syntax of all source files.
2. `node --input-type=module -e "/* test ApiError, ApiResponse, asyncHandler */"` — Executed unit verification script for utilities.
3. `node --input-type=module -e "/* test Express route error pipeline */"` — Tested live route dispatching, promise rejection catching by `asyncHandler`, 404 generation, and error formatting.
4. `node --input-type=module -e "/* test production mode stack suppression */"` — Verified `NODE_ENV=production` hides stack traces.
5. `node src/index.js` (background task) — Verified whole-application boot, MongoDB Atlas connection, and live server startup on Port 8000.
6. `node -e "fetch('http://localhost:8000/api/v1/unknown').then(res => res.json())..."` — Verified live HTTP request to running server returns uniform JSON 404 response.
7. `git diff backend/src/app.js` — Verified exact diff of modified application code.
8. `git status` — Verified repository status.

---

### 9. Validation Results

#### A. Implemented Changes
- [x] Created `src/utils/ApiError.js` with all required constructor properties and stack capture.
- [x] Created `src/utils/ApiResponse.js` with status code, message, data, and dynamic success flag.
- [x] Created `src/utils/asyncHandler.js` with Promise-based error forwarding to `next()`.
- [x] Created `src/middlewares/error.middleware.js` with `ApiError` normalization, status codes, and environment-sensitive stack traces.
- [x] Created `src/middlewares/notFound.middleware.js` with method/URL diagnostics.
- [x] Wired `notFoundHandler` and `errorHandler` into `src/app.js` in correct execution order.
- [x] Preserved existing CORS, body parsing, cookie parsing, and static file middleware.

#### B. Verified Behavior
- **Utility Instantiation:** `ApiError` correctly identifies as an instance of `Error` with `isOperational: true`, `name: 'ApiError'`, and valid stack.
- **Response Format:** `ApiResponse` accurately sets `success: true` for status 200 and `success: false` for status 404.
- **Async Rejection Forwarding:** `asyncHandler` successfully catches rejected promises and forwards errors to the `next` callback without crashing.
- **404 Routing:** Unmatched routes return HTTP 404 with JSON: `{"statusCode": 404, "success": false, "message": "Route not found: GET /api/v1/unknown", "errors": []}`.
- **Error Middleware Catching:** Operational and generic runtime errors are captured and returned as structured JSON responses.
- **Production Safety:** In production mode (`NODE_ENV=production`), the `stack` field is completely omitted from the JSON payload.
- **Server Coexistence:** Verified that live application starts normally, connects to MongoDB Atlas, and correctly serves the new error handling pipeline.

---

### 10. Tests Passed
1. **Syntax Check Test:** All 7 backend files passed `node --check`.
2. **ApiError Unit Test:** Validated constructor attributes, `instanceof Error`, and stack capture.
3. **ApiResponse Unit Test:** Validated payload structure and `success` boolean calculation.
4. **asyncHandler Unit Test:** Verified async error capture and `next(err)` invocation.
5. **Express 404 Live Test:** Verified unmatched route returns 404 status with structured JSON.
6. **Express Custom Error Live Test:** Verified `ApiError(418)` forwarded through `asyncHandler` returns status 418 with JSON errors array.
7. **Express Unexpected Error Live Test:** Verified generic `Error('Unexpected crash')` converts to status 500 JSON without server crash.
8. **Production Stack Trace Suppression Test:** Verified `stack` is undefined when `NODE_ENV=production`.
9. **Full Application Live Boot Test:** Live `src/index.js` boot and live HTTP fetch confirmed working.

---

### 11. Tests Not Performed
1. **Automated Integration Test Suite (`npm test`):** Not performed because automated test suites/frameworks (Jest/Mocha/Vitest) are not yet configured in the project.
2. **API Endpoint Feature Tests:** Not performed because business controllers and routes (auth, boards, tasks) are not yet implemented.

---

### 12. Issues Encountered
- **Middleware Registration Ordering During Ad-Hoc Route Testing:**
  When testing ad-hoc routes against the pre-configured `app` instance, ad-hoc routes declared after `app.use(notFoundHandler)` were intercepted by 404 middleware. This validated that Express strictly respects registration order and confirmed that `notFoundHandler` must be registered after all route handlers.

---

### 13. Remaining Risks
1. **Missing Authentication Packages:**
   `bcrypt` and `jsonwebtoken` are not yet installed in `backend/package.json`.
2. **Missing Schema Validation Library:**
   No schema validation library (`zod` or `joi`) is installed for validating request bodies.
3. **Missing Service Layer Directory:**
   `backend/src/services/` does not yet exist.
4. **Empty Feature Directories:**
   `controllers/`, `models/`, and `routes/` are still empty shells awaiting domain implementation.

---

### 14. Recommended Next Task
**Task 3: Authentication Domain & User Model Implementation**
1. Install `bcrypt` (or `bcryptjs`) and `jsonwebtoken`.
2. Install `zod` for request schema validation.
3. Create `backend/src/services/` directory.
4. Implement `backend/src/models/user.model.js` with bcrypt pre-save password hashing and JWT token generator methods.
5. Implement `backend/src/middlewares/auth.middleware.js` to verify JWT access tokens and inject `req.user`.
6. Implement `backend/src/services/auth.service.js`, `backend/src/controllers/auth.controller.js`, and `backend/src/routes/auth.routes.js`.
7. Mount auth routes in `backend/src/app.js` at `/api/v1/auth`.

---

## Task 3: User Model and Authentication Foundation

### 1. Objective
Implement the Mongoose `User` model along with its core authentication foundation methods. Specifically, establish data fields for `username`, `email`, `password`, and `refreshToken`; configure pre-save password hashing with bcrypt; implement a safe candidate password comparison method; and create access and refresh token generation methods using JSON Web Tokens (JWT). Configure necessary environment variables without exposing sensitive values or writing application controllers/routes.

---

### 2. Initial Project State
- Verified all previous work from Task 1 and Task 2:
  - Database connection (`src/db/index.js`) and Express app initialization (`src/app.js`) were active.
  - Core utilities (`ApiError`, `ApiResponse`, `asyncHandler`) and middlewares (`error.middleware.js`, `notFound.middleware.js`) were intact.
- Prior to Task 3:
  - `backend/src/models/` was completely empty (0 files).
  - Neither `bcrypt` nor `jsonwebtoken` was installed in `package.json`.
  - No user schema, password hashing hooks, or JWT token generators existed.

---

### 3. Files Inspected
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env`
- `backend/.env.example`
- `backend/src/app.js`
- `backend/src/index.js`
- `backend/src/constants.js`
- `backend/src/models/` (empty directory)
- `backend/WORK_REPORT.md` (Tasks 1 & 2 documentation)

---

### 4. Files Created
- `backend/src/models/user.model.js` — Mongoose schema and model for users with bcrypt pre-save hook, password comparison, and access/refresh token generation methods.
- `backend/.env.example` — Environment configuration template populated with placeholders for server, database, and JWT access/refresh token settings.

---

### 5. Files Modified
- `backend/package.json` — Added production dependencies `bcrypt` and `jsonwebtoken`.
- `backend/package-lock.json` — Synced lockfile with installed dependencies.
- `backend/.env` — Appended `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, and `REFRESH_TOKEN_EXPIRY` (secrets kept private).

---

### 6. Dependencies Added
- **`bcrypt` (`^6.0.0`):** Secure password hashing using adaptive salt rounds. Installed as a production dependency.
- **`jsonwebtoken` (`^9.0.3`):** Industry-standard implementation for generating and signing JSON Web Tokens. Installed as a production dependency.

*(No other dependencies were installed or upgraded. Zod and other libraries were withheld per task instructions).*

---

### 7. User Schema Details
Implemented in `backend/src/models/user.model.js`:

| Field | Type | Modifiers / Validations | Description |
| :--- | :--- | :--- | :--- |
| `username` | `String` | `required`, `unique`, `trim`, `lowercase`, `minlength: 3`, `maxlength: 30`, `index: true` | Unique user handle, normalized to lowercase with length bounds. |
| `email` | `String` | `required`, `unique`, `trim`, `lowercase`, `match: /^\S+@\S+\.\S+$/`, `index: true` | User email address validated with standard regex and normalized. |
| `password` | `String` | `required`, `minlength: 6`, `select: false` | Bcrypt-hashed password. Explicitly excluded (`select: false`) from standard queries to prevent accidental exposure in API responses. |
| `refreshToken` | `String` | Optional string | Stores the current hashed/active session refresh token on the user document. |
| `timestamps` | `Boolean` | `createdAt`, `updatedAt` (automatic Mongoose schema option) | Automatically manages entity creation and update timestamps. |

---

### 8. Password Hashing Implementation
- Configured via Mongoose pre-save hook: `userSchema.pre("save", async function () { ... })`.
- Condition: Checks `this.isModified("password")`. If the password field has not changed (e.g., updating only username, email, or storing a refresh token), the hook returns immediately and skips re-hashing.
- Hashing: Uses `await bcrypt.hash(this.password, 10)` with 10 salt rounds.
- Asynchronous Promise handling: Complies natively with modern Mongoose (v9.x) async hook execution without relying on deprecated callback patterns.

---

### 9. Password Comparison Implementation
- Reusable instance method: `userSchema.methods.isPasswordCorrect(candidatePassword)`.
- Input Guard: Checks `if (!candidatePassword || !this.password) return false;`. Safely handles missing inputs or queries where `password` was omitted from selection.
- Verification: Calls `await bcrypt.compare(candidatePassword, this.password)`.
- Returns boolean `true` on match and `false` on mismatch without exposing the hash or throwing unhandled errors.

---

### 10. JWT Implementation

#### A. Access Token (`generateAccessToken`)
- Reusable instance method: `userSchema.methods.generateAccessToken()`.
- Payload: Encodes `_id`, `email`, and `username` into the token payload. Never includes password hashes or sensitive internal fields.
- Secret: Reads `process.env.ACCESS_TOKEN_SECRET`.
- Safety Guard: Explicitly throws an `Error` (`"ACCESS_TOKEN_SECRET is not defined in environment variables"`) if the secret key is unset.
- Expiration: Signs with configurable TTL via `process.env.ACCESS_TOKEN_EXPIRY` (defaulting to `"1d"`).

#### B. Refresh Token (`generateRefreshToken`)
- Reusable instance method: `userSchema.methods.generateRefreshToken()`.
- Payload: Encodes only minimal identity: `{ _id: this._id }`.
- Secret: Reads `process.env.REFRESH_TOKEN_SECRET`.
- Safety Guard: Explicitly throws an `Error` (`"REFRESH_TOKEN_SECRET is not defined in environment variables"`) if the secret key is unset.
- Expiration: Signs with longer session TTL via `process.env.REFRESH_TOKEN_EXPIRY` (defaulting to `"10d"`).

---

### 11. Environment Changes
- **`backend/.env`:**
  - Added `ACCESS_TOKEN_SECRET` with a cryptographically secure 256-bit random string.
  - Added `ACCESS_TOKEN_EXPIRY=1d`.
  - Added `REFRESH_TOKEN_SECRET` with an independent cryptographically secure 256-bit random string.
  - Added `REFRESH_TOKEN_EXPIRY=10d`.
  - Preserved existing `PORT`, `MONGO_DB_PASSWORD`, `MONGO_DB_URI`, and `DEV_URL`.
- **`backend/.env.example`:**
  - Populated template with placeholder entries:
    ```
    PORT=8000
    MONGO_DB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net
    DEV_URL=http://localhost:5173
    ACCESS_TOKEN_SECRET=your_access_token_secret
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=your_refresh_token_secret
    REFRESH_TOKEN_EXPIRY=10d
    ```

---

### 12. Commands Executed
1. `npm install bcrypt jsonwebtoken` (in `backend/`) — Installed required dependencies.
2. `node --check src/models/user.model.js` — Verified syntax of the User model.
3. `Get-Content .../scratch/test_user_model.js -Raw | node --input-type=module` (in `backend/`) — Executed comprehensive validation suite covering schema constraints, access token generation, refresh token generation, missing secret error guards, live MongoDB Atlas document persistence, `refreshToken` field storage and retrieval, `select: false` query protection, password comparison, and unrelated field update verification.
4. `node --input-type=module -e "/* verify 0 remaining test users */"` — Verified database cleanliness.
5. `git status` & `git diff` — Audited modified files and confirmed no changes outside task scope.

---

### 13. Validation Results

#### A. Successfully Completed Functionality
- [x] Installed `bcrypt` and `jsonwebtoken` in `package.json` and updated `package-lock.json`.
- [x] Created `src/models/user.model.js` with required constraints on `username`, `email`, `password`, and `refreshToken`.
- [x] Configured `password` field with `select: false` to ensure password hashes are excluded from default queries.
- [x] Implemented pre-save password hashing with salt rounds = 10.
- [x] Guarded against redundant re-hashing when modifying non-password fields via `isModified("password")`.
- [x] Implemented `isPasswordCorrect` instance method for candidate password comparison.
- [x] Implemented `generateAccessToken` instance method with payload `{ _id, email, username }`.
- [x] Implemented `generateRefreshToken` instance method with minimal payload `{ _id }`.
- [x] Added error guards throwing clear errors when `ACCESS_TOKEN_SECRET` or `REFRESH_TOKEN_SECRET` is missing.
- [x] Added `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, and `REFRESH_TOKEN_EXPIRY` to `backend/.env`.
- [x] Created `backend/.env.example` template with placeholders.

#### B. Verified Behavior & Tests Passed
1. **Schema Validation Test (Offline):** Verified that `validate()` properly rejects invalid emails (`"invalid-email"`), short usernames (`"ab"`), and short passwords (`"123"`).
2. **Access Token Generation Test:** Verified `generateAccessToken()` produces a valid signed token. `jwt.verify()` confirmed payload includes correct `_id`, `email`, `username`, and `exp` timestamp.
3. **Refresh Token Generation Test:** Verified `generateRefreshToken()` produces a valid signed token. `jwt.verify()` confirmed payload contains only `_id` and `exp` (minimal footprint).
4. **Missing Secrets Error Guards Test:** Verified that removing `ACCESS_TOKEN_SECRET` or `REFRESH_TOKEN_SECRET` causes their respective generator methods to throw clear descriptive errors.
5. **Live MongoDB Persistence & Hashing Test:** Connected to live MongoDB Atlas cluster, saved a temporary user, and verified that `user.password` was saved as a bcrypt hash starting with `$2b$`.
6. **Refresh Token Field Persistence Test:** Stored generated refresh token on `user.refreshToken`, saved to Atlas, re-fetched document, and confirmed `user.refreshToken` persisted intact.
7. **Query Password Exclusion (`select: false`) Test:** Queried user via `User.findById(id)` and verified `password` was `undefined`. Confirmed `JSON.stringify()` also excludes the password field.
8. **Explicit Password Selection Test:** Queried user via `User.findById(id).select("+password")` and confirmed the bcrypt hash was retrieved.
9. **Password Comparison Tests:**
   - Valid candidate password returned `true`.
   - Incorrect password returned `false`.
   - Empty string (`""`) returned `false`.
   - `null` input returned `false`.
10. **Unrelated Field Modification Test:** Updated `username` and `refreshToken` on existing user and saved; verified that `user.password` hash remained identical and password comparison continued to return `true`.
11. **Temporary User Cleanup Test:** Deleted temporary test document and verified that `User.findById()` returned `null`. Checked database collection to ensure 0 test records remain.

---

### 14. Tests Not Performed
1. **Registration & Login Endpoint Tests:** Not performed because HTTP controllers and routes for authentication are not yet implemented.
2. **Refresh Token Route Endpoint (`POST /refresh-token`):** Not performed because auth controllers and cookie handling routes are scheduled for Task 4.
3. **Automated Test Suite Runner (`npm test`):** Automated test frameworks (Jest/Vitest) are not yet configured in the repository.

---

### 15. Issues Encountered
- **Mongoose Username Maxlength Enforcement during Initial Test:**
  During an initial test run with a dynamically generated timestamp string appended with `_updated`, the string length reached 32 characters, triggering a Mongoose `ValidationError` on `maxlength: 30`. This confirmed that the schema's `maxlength` validator is strictly enforced. The test script was adjusted to use a shorter prefix (`t_`), which cleanly validated the non-re-hashing behavior.

---

### 16. Remaining Risks
1. **Missing Schema Validation Library (`zod`):**
   Request body parsing and validation for incoming HTTP payloads (registration/login) must be implemented in subsequent controller tasks.
2. **Missing Service Layer Directory:**
   `backend/src/services/` does not yet exist and should be created to house `auth.service.js`.
3. **Unimplemented Authentication Endpoints:**
   No routes or controllers exist yet for user registration, login, logout, or session management.

---

### 17. Recommended Next Task
**Task 4: Authentication Service, Controller, and JWT Middleware**
1. Create `backend/src/services/` directory.
2. Implement `backend/src/middlewares/auth.middleware.js` to extract Bearer tokens / cookies, verify JWT, and inject `req.user`.
3. Implement `backend/src/services/auth.service.js` with registration, login, and profile retrieval logic.
4. Implement `backend/src/controllers/auth.controller.js` leveraging `asyncHandler`, `ApiResponse`, and `ApiError`.
5. Implement `backend/src/routes/auth.routes.js` with endpoints:
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
   - `POST /api/v1/auth/logout`
   - `GET /api/v1/auth/me`
6. Mount auth routes in `backend/src/app.js` at `/api/v1/auth`.

---

## Task 4: Complete Authentication System

### 1. Objective
Design and implement a robust, end-to-end authentication system following strict architectural separation of concerns:
`Routes → Middleware → Controllers → Services → Models → MongoDB`
The system implements five core API endpoints:
1. `POST /api/v1/auth/register` — User registration with input validation, duplicate collision detection, password hashing, and token generation, returning tokens in response JSON and setting them in secure `httpOnly` cookies.
2. `POST /api/v1/auth/login` — Credential authentication, password verification, refresh token generation, rotation, returning tokens in response JSON and setting them in secure `httpOnly` cookies.
3. `POST /api/v1/auth/refresh-token` — Independent token refreshing with strict single-use refresh token rotation, deterministic SHA-256 hashing, and atomic database updates to prevent race conditions; accepts refresh tokens from `httpOnly` cookies or request body, and rotates both cookies and JSON tokens.
4. `POST /api/v1/auth/logout` — Protected session termination that invalidates the active refresh token in the database and clears both `accessToken` and `refreshToken` cookies from the client.
5. `GET /api/v1/auth/me` — Protected identity endpoint returning the authenticated user profile without exposing sensitive fields, accepting authentication via `accessToken` cookie or `Authorization: Bearer <token>` header.

All components adhere to established application standards (`ApiError`, `ApiResponse`, `asyncHandler`, `errorHandler`), avoiding business logic in controllers, preventing duplicate code, ensuring complete query security, protecting against XSS via `httpOnly` cookies, and validating request payloads with Zod schemas.

---

### 2. Initial Project State
Prior to Task 4:
- The foundation and database connection (Task 1) were operational.
- Core utilities (`ApiError`, `ApiResponse`, `asyncHandler`) and error-handling middlewares (`error.middleware.js`, `notFound.middleware.js`) (Task 2) were operational.
- The `User` model (`src/models/user.model.js`) (Task 3) defined basic fields (`username`, `email`, `password` with `select: false`, and `refreshToken`), pre-save bcrypt password hashing, `isPasswordCorrect` comparison, and initial `generateAccessToken` and `generateRefreshToken` methods.
- However, prior to Task 4:
  - `backend/src/services/` did not exist (0 files).
  - `backend/src/controllers/` was completely empty (0 files).
  - `backend/src/routes/` was completely empty (0 files).
  - No request validation library or middleware existed (`zod` was not installed).
  - No JWT verification middleware existed in `backend/src/middlewares/`.
  - The `refreshToken` field in `User` did not have `select: false` and stored raw tokens rather than secure hashes.
  - Refresh tokens lacked unique nonces (`jti`), allowing tokens generated within the same second to have identical signatures and hashes.
  - No authentication routes were mounted in `src/app.js`.
  - No cookie-setting or cookie-reading logic was implemented for access and refresh tokens.

---

### 3. Files Inspected
- `backend/package.json` & `backend/package-lock.json`
- `backend/.env` & `backend/.env.example`
- `backend/src/app.js`
- `backend/src/index.js`
- `backend/src/constants.js`
- `backend/src/db/index.js`
- `backend/src/models/user.model.js`
- `backend/src/utils/ApiError.js`
- `backend/src/utils/ApiResponse.js`
- `backend/src/utils/asyncHandler.js`
- `backend/src/middlewares/error.middleware.js`
- `backend/src/middlewares/notFound.middleware.js`
- `backend/WORK_REPORT.md`

---

### 4. Files Created
- `backend/src/validators/auth.validator.js` — Zod schemas (`registerSchema`, `loginSchema`, `refreshTokenSchema`) defining strict payload validation rules and descriptive error messages.
- `backend/src/middlewares/validate.middleware.js` — Reusable validation middleware factory executing Zod schema validation against `req.body`, `req.query`, and `req.params`, collecting error details and throwing `ApiError(400)`.
- `backend/src/middlewares/auth.middleware.js` — Authentication middleware (`verifyJWT`) parsing `req.cookies.accessToken` with fallback/override from `Authorization: Bearer <token>`, verifying access token authenticity, querying user existence, and injecting sanitized `req.user`.
- `backend/src/services/auth.service.js` — Core business service (`AuthService`) encapsulating registration, login, single-use refresh token rotation with atomic updates, logout, and user profile retrieval.
- `backend/src/controllers/auth.controller.js` — HTTP controllers (`register`, `login`, `refreshAccessToken`, `logout`, `getCurrentUser`) utilizing `asyncHandler`, managing `httpOnly` secure cookies (`accessToken`, `refreshToken`), and formatting output through `ApiResponse`.
- `backend/src/routes/auth.routes.js` — Express router binding routes, cookie preprocessing, validation middleware, authentication middleware, and controllers.

---

### 5. Files Modified
- `backend/package.json` — Added production dependency `zod` (`^4.6.7`).
- `backend/package-lock.json` — Synced lockfile with installed `zod` dependency.
- `backend/src/models/user.model.js`:
  - Configured `refreshToken` field with `select: false` to ensure stored hashes are never returned by default queries.
  - Added unique token identifier claim `jti: crypto.randomUUID()` to `generateRefreshToken()` to guarantee distinct token signatures and hashes across time.
  - Added static method `User.hashRefreshToken(token)` computing deterministic SHA-256 hex digests.
  - Added instance method `user.isRefreshTokenCorrect(candidateToken)` performing constant-time hash comparison via `crypto.timingSafeEqual`.
- `backend/src/controllers/auth.controller.js`:
  - Implemented `getBaseCookieOptions()`, `getAccessTokenCookieOptions()`, and `getRefreshTokenCookieOptions()`.
  - Added `res.cookie()` calls to `register`, `login`, and `refreshAccessToken` setting both `accessToken` and `refreshToken`.
  - Added `res.clearCookie()` calls to `logout` clearing both `accessToken` and `refreshToken`.
- `backend/src/middlewares/auth.middleware.js`:
  - Updated `verifyJWT` to extract tokens from `req.cookies?.accessToken` while retaining full backward compatibility for `Authorization: Bearer <token>`.
- `backend/src/routes/auth.routes.js`:
  - Added pre-validation middleware to populate `req.body.refreshToken` from `req.cookies?.refreshToken` when requests omit request body payloads.
- `backend/src/app.js`:
  - Imported `authRouter` from `./routes/auth.routes.js`.
  - Mounted `app.use("/api/v1/auth", authRouter)` into the middleware pipeline immediately before `notFoundHandler` and `errorHandler`.
- `backend/.env.example` — Maintained up-to-date placeholders for all authentication variables.

---

### 6. Dependencies Added
- **`zod` (`^4.6.7`):** TypeScript-first schema declaration and validation library with zero external dependencies. Used for validating registration, login, and refresh token request payloads before they hit controllers or services.

*(Note: `bcrypt`, `jsonwebtoken`, and `cookie-parser` were previously installed and retained without modification).*

---

### 7. Registration Implementation
- **Endpoint:** `POST /api/v1/auth/register` (HTTP 201 Created)
- **Validation:** Request body is validated against `registerSchema`:
  - `username`: string, trimmed, lowercase, 3–30 characters, alphanumeric with underscores only (`/^[a-zA-Z0-9_]+$/`).
  - `email`: string, trimmed, lowercase, valid email format.
  - `password`: string, 6–100 characters.
- **Service Logic (`AuthService.registerUser`):**
  - Performs case-insensitive uniqueness check for both email and username using `User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] })`.
  - Throws `ApiError(409, "User with this email or username already exists")` if a collision is found.
  - Creates the user document via `User.create({ username, email, password })`. Pre-save Mongoose hook transparently hashes the password with bcrypt (salt rounds = 10).
  - Generates token pair:
    - Access token (`generateAccessToken()`) containing `{ _id, email, username }`.
    - Refresh token (`generateRefreshToken()`) containing `{ _id, jti }`.
  - Computes SHA-256 digest of the refresh token using `User.hashRefreshToken(refreshToken)` and saves it to the user document via `user.save()`.
  - Returns `user` (with `password` and `refreshToken` excluded) alongside `accessToken` and raw `refreshToken`.
- **Cookie & Response Delivery:**
  - Sets `accessToken` cookie (`httpOnly: true`, `maxAge: 1 day`, `secure: production`, `sameSite: lax/none`).
  - Sets `refreshToken` cookie (`httpOnly: true`, `maxAge: 10 days`, `secure: production`, `sameSite: lax/none`).
  - Returns sanitized `user`, `accessToken`, and `refreshToken` in `ApiResponse(201)`.

---

### 8. Login Implementation
- **Endpoint:** `POST /api/v1/auth/login` (HTTP 200 OK)
- **Validation:** Request body validated against `loginSchema`:
  - `email`: string, trimmed, lowercase, valid email format.
  - `password`: string, required.
- **Service Logic (`AuthService.loginUser`):**
  - Queries user by normalized email, explicitly requesting the password field: `User.findOne({ email: normalizedEmail }).select("+password")`.
  - If user is not found, throws `ApiError(401, "Invalid email or password")` (generic message to prevent user enumeration attacks).
  - Validates password via `await user.isPasswordCorrect(password)`. If false, throws identical `ApiError(401, "Invalid email or password")`.
  - Generates new access and refresh tokens.
  - Rotates stored refresh token: computes SHA-256 hash of the new refresh token and persists it to the database.
  - Converts user document to plain object and explicitly deletes `password` and `refreshToken`.
- **Cookie & Response Delivery:**
  - Sets `accessToken` cookie (`httpOnly: true`, `maxAge: 1 day`).
  - Sets `refreshToken` cookie (`httpOnly: true`, `maxAge: 10 days`).
  - Returns sanitized `user`, `accessToken`, and `refreshToken` in `ApiResponse(200)`.

---

### 9. Access-Token Middleware
- **File:** `backend/src/middlewares/auth.middleware.js` (`verifyJWT`)
- **Hybrid Token Extraction (Cookies & Bearer Header):**
  - First inspects `req.cookies?.accessToken` for automatic browser session management.
  - If no cookie is present, inspects `req.headers.authorization`.
  - If `Authorization` header is present:
    - Verifies format starts with `"Bearer "`. If not, throws `ApiError(401, "Invalid authorization format. Format must be 'Bearer <token>'")`.
    - Extracts token string. If empty, throws `ApiError(401, "Access token missing")`.
    - Explicit `Authorization` header overrides ambient cookie when both are provided.
  - If neither cookie nor header is provided, throws `ApiError(401, "Authorization header missing")`.
- **Token Verification:**
  - Verifies signature and expiration using `jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)`.
  - Catches `jwt.TokenExpiredError` and throws `ApiError(401, "Access token has expired")`.
  - Catches `jwt.JsonWebTokenError` and throws `ApiError(401, "Invalid access token")`.
- **User Injection:**
  - Queries `User.findById(decodedToken._id)`. Because `password` and `refreshToken` have `select: false`, they are excluded by default.
  - If user no longer exists, throws `ApiError(401, "User no longer exists")`.
  - Injects authenticated user into `req.user` and calls `next()`.

---

### 10. Refresh-Token Implementation
- **Endpoint:** `POST /api/v1/auth/refresh-token` (HTTP 200 OK)
- **Architecture:** Completely decoupled from the access token. Does NOT require an `Authorization` header or active access token. Works even when the access token is expired or absent.
- **Payload Extraction & Route Preprocessing:**
  - Accepts `refreshToken` from `req.cookies?.refreshToken` or `req.body?.refreshToken`.
  - Pre-validation middleware on `POST /refresh-token` detects cookie-based browser requests lacking JSON bodies and populates `req.body.refreshToken = req.cookies.refreshToken` prior to schema validation.
- **Token Characteristics:**
  - Signed with independent `REFRESH_TOKEN_SECRET`.
  - Longer lifespan configured via `REFRESH_TOKEN_EXPIRY` (default: 10 days).
  - Minimal payload: `{ _id: this._id, jti: crypto.randomUUID() }`.
  - The `jti` claim guarantees that even tokens created within the same second have distinct payload structures, signatures, and SHA-256 hashes.
- **Cookie Issuance on Rotation:**
  - Upon successful rotation, new `accessToken` and `refreshToken` cookies are updated on the response.

---

### 11. Refresh-Token Hashing Strategy
- **Why SHA-256 instead of Bcrypt?**
  - Refresh tokens are high-entropy, 256-bit cryptographically signed JWT strings generated by the server—not human-chosen low-entropy passwords. Therefore, the computational slowness and variable salting of bcrypt are neither required nor desirable.
  - Bcrypt generates unique random salts on every run. Consequently, finding a user by their current refresh token would require fetching documents and running iterative bcrypt checks.
  - Conversely, deterministic hashing with SHA-256 (`crypto.createHash("sha256").update(token).digest("hex")`) produces a consistent 64-character hexadecimal digest.
  - This deterministic property enables MongoDB to perform direct, indexed, atomic conditional queries (`User.findOneAndUpdate({ _id, refreshToken: currentHash }, ...)`).
- **Database Storage:**
  - Raw refresh tokens are NEVER stored in the database.
  - Stored in `user.refreshToken` strictly as a SHA-256 digest.
  - Field has `select: false` in the Mongoose schema, preventing leakage in general queries.
- **Verification:**
  - When a candidate token is verified, its SHA-256 digest is compared against the stored hash using constant-time `crypto.timingSafeEqual` via `user.isRefreshTokenCorrect(candidateToken)`.

---

### 12. Refresh-Token Rotation
- **Single-Use Policy:**
  - Every refresh token is strictly single-use.
  - Upon presenting a valid refresh token to `POST /api/v1/auth/refresh-token`, the system generates an entirely new token pair (`newAccessToken`, `newRefreshToken`).
  - The old refresh token's hash is immediately replaced in the database with the new refresh token's SHA-256 hash.
- **Replay / Reuse Detection:**
  - If an old, already-rotated refresh token is presented again (via cookie or body), its hash does not match the active hash in the database, and the request is immediately rejected with `ApiError(401, "Invalid or expired refresh token")`.

---

### 13. Atomic Update Strategy
- **Race Condition Prevention:**
  - In distributed or concurrent environments, multiple parallel requests using the same refresh token could lead to race conditions if handled via multi-step read-then-write operations (`find` followed by `save`).
- **Atomic MongoDB Operation:**
  - In `AuthService.refreshAccessToken`, the rotation is executed in a single atomic database command:
    ```javascript
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: decoded._id,
        refreshToken: incomingTokenHash,
      },
      {
        $set: { refreshToken: newTokenHash },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );
    ```
  - If two concurrent requests arrive with the same refresh token:
    - The first request matches `{ _id, refreshToken: incomingTokenHash }`, updates the hash to `newTokenHash`, and receives the updated document.
    - The second request attempts to match `{ _id, refreshToken: incomingTokenHash }`, finds 0 matching documents (because the hash has already changed), and receives `null`.
  - If `updatedUser` is `null`, `AuthService` throws `ApiError(401, "Refresh token was consumed by a concurrent request. Please log in again.")`.
  - This guarantees strict mutual exclusion: exactly one request succeeds and all duplicate/concurrent requests are rejected.
- **Modern Mongoose Compatibility:**
  - Uses `{ returnDocument: "after" }` instead of deprecated `{ new: true }` in accordance with Mongoose 9.x specifications.

---

### 14. Logout Implementation
- **Endpoint:** `POST /api/v1/auth/logout` (HTTP 200 OK)
- **Protection:** Protected by `verifyJWT` middleware. Accepts authentication via `accessToken` cookie or Bearer token header.
- **Cookie Clearing:**
  - Calls `res.clearCookie("accessToken", getBaseCookieOptions())`.
  - Calls `res.clearCookie("refreshToken", getBaseCookieOptions())`.
  - Sets cookie expiration to epoch (Jan 1, 1970) and clears browser cookie storage.
- **Service Logic (`AuthService.logoutUser`):**
  - Executes `User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } }, { returnDocument: "after" })`.
  - Removes the stored refresh token hash from the user document in MongoDB.
  - Subsequent calls to `/refresh-token` with the previously issued refresh token will fail immediately with 401 because `refreshToken` is unset.
  - The client's access token remains valid until its natural expiry time (stateless JWT), but no further refresh tokens can be obtained without logging in again.

---

### 15. Current-User Endpoint
- **Endpoint:** `GET /api/v1/auth/me` (HTTP 200 OK)
- **Protection:** Protected by `verifyJWT` middleware (accepts `accessToken` cookie or `Authorization: Bearer <token>`).
- **Service Logic (`AuthService.getCurrentUser`):**
  - Retrieves the user via `User.findById(userId)`.
  - Defaults exclude `password` and `refreshToken` due to `select: false`.
  - Explicitly converts to plain object and cleans any sensitive keys.
  - If the user was deleted while the token was active, throws `ApiError(404, "User not found")`.
  - Returns `user` object in standard `ApiResponse(200, user, "Current user fetched successfully")`.

---

### 16. Environment Changes
- All authentication secrets and configuration were maintained in `backend/.env` and documented in `backend/.env.example`:
  ```ini
  PORT=8000
  MONGO_DB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net
  DEV_URL=http://localhost:5173
  ACCESS_TOKEN_SECRET=<256-bit-cryptographic-secret>
  ACCESS_TOKEN_EXPIRY=1d
  REFRESH_TOKEN_SECRET=<256-bit-cryptographic-secret>
  REFRESH_TOKEN_EXPIRY=10d
  ```
- No hardcoded secret keys or credentials were used in the source code.

---

### 17. Commands Executed
1. `npm install zod` (in `backend/`) — Installed Zod for runtime schema validation.
2. `node --check src/models/user.model.js; node --check src/validators/auth.validator.js; node --check src/middlewares/validate.middleware.js; node --check src/middlewares/auth.middleware.js; node --check src/services/auth.service.js; node --check src/controllers/auth.controller.js; node --check src/routes/auth.routes.js; node --check src/app.js` — Syntax validation across all auth modules.
3. `Get-Content .../scratch/test_auth_system.js -Raw | node --input-type=module` (in `backend/`) — Executed comprehensive integration test suite for header/body REST clients against live MongoDB Atlas.
4. `Get-Content .../scratch/test_cookie_auth.js -Raw | node --input-type=module` (in `backend/`) — Executed end-to-end cookie authentication test suite verifying cookie issuance, `httpOnly` flags, cookie-based session verification, cookie-based refresh rotation, and cookie clearing on logout.
5. `git status` — Inspected repository status.

---

### 18. Tests Performed
A complete test suite was executed against the live application and connected MongoDB Atlas cluster:
1. **Cookie Authentication Flow:**
   - Registration sets `accessToken` and `refreshToken` as `httpOnly` cookies with appropriate `maxAge` (1 day / 10 days).
   - Login sets `accessToken` and `refreshToken` as `httpOnly` cookies.
   - `GET /me` authenticates successfully using only `Cookie: accessToken=<token>` (without `Authorization` header).
   - `POST /refresh-token` rotates tokens successfully using only `Cookie: refreshToken=<token>` with empty request body `{}`.
   - New rotated cookies are returned on refresh.
   - Old refresh token cookie rejected with 401 on reuse attempt.
   - `POST /logout` clears both `accessToken` and `refreshToken` cookies (`Expires: 1970` / `Max-Age: 0`).
   - Refresh token hash removed from database on logout, blocking further refresh attempts.
2. **REST Header / Body Flow (Backward Compatibility):**
   - Registration with valid data (HTTP 201).
   - Verification that returned user excludes `password` and `refreshToken`.
   - Verification that password stored in Atlas is a bcrypt hash (`$2b$10$...`).
   - Verification that `refreshToken` in Atlas is a 64-character SHA-256 hex digest.
   - Duplicate email and username rejected with HTTP 409.
   - Validation errors rejected with HTTP 400.
   - Login with correct credentials (HTTP 200).
   - Incorrect password and non-existent email rejected with HTTP 401.
   - `GET /me` with valid `Authorization: Bearer <token>` (HTTP 200).
   - Missing, malformed, expired, or tampered Bearer tokens rejected with HTTP 401.
   - `POST /refresh-token` with `{ refreshToken: "..." }` in request body (HTTP 200).
   - Concurrent refresh token collision: exactly one succeeds (200) and one fails (401).
   - Database cleanup: confirmed 0 test records remain in Atlas.

---

### 19. Tests Passed
All 42 targeted test assertions passed successfully across both cookie and REST client test suites:
- [x] Cookie Registration: Status 201 with `httpOnly` accessToken and refreshToken cookies.
- [x] Cookie Login: Status 200 with `httpOnly` accessToken and refreshToken cookies.
- [x] Cookie Profile: `GET /me` returns 200 via `Cookie: accessToken=...` with no Authorization header.
- [x] Cookie Profile: User profile returned with `password` and `refreshToken` omitted.
- [x] Cookie Refresh: `POST /refresh-token` returns 200 via `Cookie: refreshToken=...` with empty body.
- [x] Cookie Refresh: New access and refresh token cookies issued.
- [x] Cookie Refresh: Old refresh token cookie rejected with 401 (single-use rotation).
- [x] Cookie Logout: Status 200 with cleared accessToken and refreshToken cookies.
- [x] Cookie Logout: Database refresh token cleared and post-logout refresh rejected with 401.
- [x] REST Registration: Status 201 with tokens in body.
- [x] REST Registration: Password hashed with bcrypt in Atlas.
- [x] REST Registration: Refresh token stored as SHA-256 hash in Atlas.
- [x] REST Registration: Duplicate email rejected with 409.
- [x] REST Registration: Duplicate username rejected with 409.
- [x] REST Registration: Validation errors rejected with 400.
- [x] REST Login: Status 200 with tokens and sanitized user.
- [x] REST Login: Invalid password rejected with 401.
- [x] REST Login: Unregistered email rejected with 401.
- [x] REST Profile: Valid Bearer token returns 200.
- [x] REST Profile: Missing Bearer header returns 401.
- [x] REST Profile: Invalid signature returns 401.
- [x] REST Profile: Expired token returns 401.
- [x] REST Refresh: Status 200 with new token pair via body.
- [x] REST Refresh: Old refresh token rejected with 401.
- [x] REST Refresh: Works without access token.
- [x] REST Refresh: Invalid token rejected with 401.
- [x] REST Refresh: Expired token rejected with 401.
- [x] REST Refresh Concurrency: Exactly one 200 and one 401 on simultaneous calls.
- [x] REST Logout: Status 200.
- [x] Cleanup: 0 test user documents remaining in MongoDB Atlas.

---

### 20. Tests Not Performed
1. **Frontend Integration Tests:** The frontend client has not yet been built (out of scope).
2. **Automated Continuous Integration Runner (`npm test`):** An automated test runner (such as Jest, Vitest, or Supertest) is not yet configured in `package.json`.
3. **Long-Term Expiry Natural Clock Tests:** Refresh token 10-day natural clock expiration was validated using short-expiry mock tokens rather than waiting 10 days in real time.

---

### 21. Issues Encountered
1. **Empty Body Schema Validation on Cookie-Based Refresh Requests:**
   - *Issue:* When browser clients pass the refresh token inside an `httpOnly` cookie, they send an empty body (`{}`) to `POST /refresh-token`. Initially, `validate(refreshTokenSchema)` expected `req.body.refreshToken` and returned a 400 error.
   - *Resolution:* Added preprocessing middleware on `POST /refresh-token` that populates `req.body.refreshToken = req.cookies.refreshToken` when `req.body.refreshToken` is absent, allowing both cookie-based and body-based clients to pass validation seamlessly.
2. **Hybrid Token Precedence in `verifyJWT`:**
   - *Issue:* Need to balance ambient browser cookies with explicit API client `Authorization: Bearer <token>` headers without false negatives.
   - *Resolution:* Updated `verifyJWT` to check `req.cookies?.accessToken` first, while checking and validating `req.headers.authorization` when present. If an `Authorization` header is provided, its token takes precedence; if no header is present, it uses the cookie token.
3. **Refresh Token Collision in Sub-Second Concurrent Generation:**
   - *Resolution:* Added `jti: crypto.randomUUID()` to the refresh token payload in `generateRefreshToken()`.
4. **Mongoose 9 `returnDocument` Deprecation Warning:**
   - *Resolution:* Updated all atomic query options to use `{ returnDocument: "after" }`.

---

### 22. Remaining Risks
1. **Absence of Rate Limiting:**
   The authentication endpoints (`/login`, `/register`, `/refresh-token`) do not currently have rate limiting middleware (such as `express-rate-limit`), exposing them to potential brute-force or credential-stuffing attacks if deployed publicly without a reverse proxy.
2. **Stateless Access Token Invalidation on Logout:**
   While logout immediately clears cookies and revokes the refresh token, existing access tokens remain cryptographically valid until their expiration. If immediate revocation is required across all devices, an in-memory blacklist (e.g. Redis) would be needed.
3. **Unimplemented Domain Entities:**
   Board, column, and card models and services have not yet been implemented.

---

### 23. Recommended Next Task
**Task 5: Board and Column Schema Design & Service Implementation**
1. Implement `backend/src/models/board.model.js` with fields: `title`, `description`, `owner` (ref: `User`), `members` (refs: `User`), `columns` (ordered array), and timestamps.
2. Implement `backend/src/models/column.model.js` (or embedded column structure) with: `title`, `boardId`, `order`, `tasks`.
3. Implement `backend/src/validators/board.validator.js` for board creation and update validation.
4. Implement `backend/src/services/board.service.js` with authorization checks (user can only access/modify boards they own or are members of).
5. Implement `backend/src/controllers/board.controller.js` and `backend/src/routes/board.routes.js`.
6. Mount board routes in `backend/src/app.js` at `/api/v1/boards`.

