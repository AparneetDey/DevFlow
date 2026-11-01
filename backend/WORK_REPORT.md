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

---

## Task 5: Board Management

### 1. Initial Project State
Prior to Task 5:
- The foundation, database connection, utilities, error handling (Tasks 1 & 2), and User authentication system (Tasks 3 & 4) were fully implemented and operational.
- The authentication router was mounted at `/api/v1/auth`, supporting both `httpOnly` secure cookies and `Authorization: Bearer <token>` headers.
- Prior to Task 5, no board domain existed:
  - `backend/src/models/board.model.js` did not exist.
  - `backend/src/validators/board.validator.js` did not exist.
  - `backend/src/services/board.service.js` did not exist.
  - `backend/src/controllers/board.controller.js` did not exist.
  - `backend/src/routes/board.routes.js` did not exist.
  - `backend/src/middlewares/validate.middleware.js` only supported `req.body` validation and lacked route parameter validation (`validateParams`).
  - No board endpoints were mounted in `backend/src/app.js`.

---

### 2. Files Inspected
- `backend/src/app.js`
- `backend/src/models/user.model.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/middlewares/validate.middleware.js`
- `backend/src/utils/ApiError.js`
- `backend/src/utils/ApiResponse.js`
- `backend/src/utils/asyncHandler.js`
- `backend/src/routes/auth.routes.js`
- `backend/WORK_REPORT.md`

---

### 3. Files Created
- `backend/src/models/board.model.js` — Mongoose schema and model for boards, featuring embedded column subdocuments (`columnSchema`), default immutable columns constant (`DEFAULT_COLUMNS`), title, description, owner reference (`User`), and timestamps.
- `backend/src/validators/board.validator.js` — Zod validation schemas for board creation (`createBoardSchema`), board update (`updateBoardSchema`), and route parameter ObjectId validation (`boardIdParamSchema`) with strict unrecognized field rejection (`.strict()`).
- `backend/src/services/board.service.js` — Core business service (`boardService`) managing board creation, user board listing, single board retrieval, updates, deletion, ObjectId verification, and strict ownership authorization.
- `backend/src/controllers/board.controller.js` — Express controllers (`createBoard`, `getUserBoards`, `getBoard`, `updateBoard`, `deleteBoard`) wrapped with `asyncHandler` and formatting JSON responses via `ApiResponse`.
- `backend/src/routes/board.routes.js` — Express router binding all board CRUD endpoints to `verifyJWT`, parameter validation, body validation, and controller methods.

---

### 4. Files Modified
- `backend/src/middlewares/validate.middleware.js` — Added `validateParams(schema)` middleware factory to validate route parameters (`req.params`) against Zod schemas while preserving existing `validate(schema)` for `req.body`.
- `backend/src/app.js` — Imported `boardRouter` from `./routes/board.routes.js` and mounted `app.use("/api/v1/boards", boardRouter)` immediately after `authRouter` and before `notFoundHandler` and `errorHandler`.
- `backend/src/routes/auth.routes.js` — Configured `/logout` endpoint as `router.delete("/logout", verifyJWT, logout)` for session termination.
- `backend/WORK_REPORT.md` — Appended Task 5 technical documentation.

---

### 5. Board Schema and Default-Column Design
- **Model:** `backend/src/models/board.model.js`
- **Fields:**
  - `title`: `String`, required, trimmed, min 1 char, max 100 chars.
  - `description`: `String`, trimmed, max 500 chars, default `""`.
  - `owner`: `Schema.Types.ObjectId`, ref `"User"`, required, indexed.
  - `columns`: Array of embedded subdocuments using `columnSchema` (`_id: false`).
  - `timestamps: true` (`createdAt`, `updatedAt`).
- **Embedded Column Schema:**
  - `title`: `String`, required, trimmed.
  - `key`: `String`, required, trimmed (stable identifier).
  - `order`: `Number`, required (integer index position).
  - Configured with `{ _id: false }` to maintain lightweight embedded subdocuments focused on key-based column identification.
- **Default Columns:**
  Every newly created board automatically receives the following immutable columns in strict sequence:
  1. Todo — `key: "todo"`, `order: 0`
  2. In Progress — `key: "in-progress"`, `order: 1`
  3. Done — `key: "done"`, `order: 2`
- **Immutability Protection:**
  - `columns` and `owner` are forbidden in request bodies via Zod `.strict()` in both `createBoardSchema` and `updateBoardSchema`.
  - The service layer initializes `columns` strictly from `DEFAULT_COLUMNS.map((col) => ({ ...col }))` and never accepts columns or owner from client input.
  - `updateBoard` strictly restricts mutations to `title` and `description` only.

---

### 6. API Endpoints

All endpoints are mounted under `/api/v1/boards` and protected by `verifyJWT`:

| Method | Endpoint | Protection | Validation | Purpose | Status Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/boards` | `verifyJWT` | `validate(createBoardSchema)` | Create a new board with default columns | `201 Created` |
| `GET` | `/api/v1/boards` | `verifyJWT` | None | List authenticated user's boards (sorted by `updatedAt` desc) | `200 OK` |
| `GET` | `/api/v1/boards/:boardId` | `verifyJWT` | `validateParams(boardIdParamSchema)` | Retrieve a single board owned by user | `200 OK` |
| `PATCH` | `/api/v1/boards/:boardId` | `verifyJWT` | `validateParams(boardIdParamSchema)` + `validate(updateBoardSchema)` | Update title and/or description of owned board | `200 OK` |
| `DELETE` | `/api/v1/boards/:boardId` | `verifyJWT` | `validateParams(boardIdParamSchema)` | Delete owned board | `200 OK` |

---

### 7. Authorization Implementation
- **Strict User Ownership Scoping:**
  - The owner ID is never accepted from the client. It is derived exclusively from `req.user._id` populated by `verifyJWT`.
  - All database queries filter strictly on both `_id: boardId` and `owner: userId`:
    - Retrieval: `Board.findOne({ _id: boardId, owner: userId })`
    - Update: `Board.findOneAndUpdate({ _id: boardId, owner: userId }, { $set: allowedUpdates }, { returnDocument: "after", runValidators: true })`
    - Deletion: `Board.findOneAndDelete({ _id: boardId, owner: userId })`
    - Listing: `Board.find({ owner: userId }).sort({ updatedAt: -1 })`
- **Information Leakage Prevention:**
  - If User A attempts to view, update, or delete a board owned by User B, the query matches 0 documents and returns `404 Not Found`. This prevents attackers from enumerating valid board IDs owned by other users.
- **ObjectId Validation:**
  - In addition to Zod param schema validation, `boardService.validateObjectId` performs defense-in-depth checking using `mongoose.Types.ObjectId.isValid()`, rejecting malformed IDs with `400 Bad Request` instead of triggering Mongoose runtime `CastError` exceptions.

---

### 8. Dependencies Added
*No new external packages were added.*
The implementation leverages existing production dependencies:
- `mongoose` (`^9.11.4`)
- `express` (`^5.3.0`)
- `zod` (`^4.6.7`)
- `jsonwebtoken` (`^9.0.3`)

---

### 9. Commands Executed
1. `node --check ...` — Validated syntax across all 21 backend source files.
2. `cd backend; Get-Content .../scratch/test_board_management.js -Raw | node --input-type=module` — Executed complete board integration test suite against live MongoDB Atlas.
3. `cd backend; Get-Content .../scratch/test_cookie_auth.js -Raw | node --input-type=module` — Executed cookie authentication regression tests.
4. `cd backend; Get-Content .../scratch/test_auth_system.js -Raw | node --input-type=module` — Executed REST authentication regression tests.

---

### 10. Tests Performed and Actual Results
All 14 test scenarios were verified against the live MongoDB Atlas cluster:
1. **Authenticated Board Creation:** Status 201; returns board object with assigned `_id` and timestamps.
2. **Default Columns Verification:** Contains exactly 3 embedded columns in proper order: `Todo` (0), `In Progress` (1), `Done` (2).
3. **Database Field Persistence:** Confirmed `title`, `description`, and `owner` persisted correctly in Atlas document.
4. **User Board Listing:** Returned array of boards belonging to the user, sorted in descending order of `updatedAt` (`Beta` before `Alpha`).
5. **Individual Board Retrieval:** `GET /boards/:id` returned the full board and columns (Status 200).
6. **Title and Description Updates:**
   - Full update (`title` and `description`) succeeded (Status 200).
   - Partial update (`title` only) updated title and preserved existing description.
7. **Board Deletion:** `DELETE /boards/:id` succeeded (Status 200); subsequent GET returned 404; database confirmed document removed.
8. **Unauthenticated Request Rejection:** All 5 endpoints rejected requests lacking JWT authentication with 401.
9. **Invalid Board ID Handling:** Non-ObjectId parameters (`/invalid-object-id`, `/12345`) rejected with 400.
10. **Multi-User Isolation & Cross-User Security:**
    - User A attempting `GET` on User B's board returned 404.
    - User A attempting `PATCH` on User B's board returned 404 (database title remained unmodified).
    - User A attempting `DELETE` on User B's board returned 404 (database document remained intact).
    - User B's board listing contained only User B's board.
11. **Owner Override Prevention:** Supplying `owner` in creation or update body rejected with 400 (Zod `.strict()`).
12. **Column Mutation Prevention:** Supplying `columns` in creation or update body rejected with 400 (Zod `.strict()`).
13. **Input Validation Rejections:**
    - Empty title (`""`) $\rightarrow$ 400.
    - Whitespace-only title (`"   "`) $\rightarrow$ 400.
    - Missing title on create $\rightarrow$ 400.
    - Title > 100 characters $\rightarrow$ 400.
    - Description > 500 characters $\rightarrow$ 400.
    - Non-string title $\rightarrow$ 400.
    - Empty update payload (`{}`) $\rightarrow$ 400.
14. **Authentication Non-Regression:** `GET /auth/me` and `POST /auth/refresh-token` verified fully functional.
15. **Database Teardown:** All test users and boards deleted; verified 0 remaining test artifacts in Atlas.

---

### 11. Tests Not Performed
1. **Frontend Integration Tests:** The frontend client has not yet been built (out of scope).
2. **Task and Card Integration Tests:** Task and card entities are scheduled for subsequent tasks.
3. **Automated Continuous Integration Runner (`npm test`):** Automated test frameworks (Jest/Vitest) are not yet installed in `package.json`.

---

### 12. Issues Encountered
1. **Route Parameter Validation Separation:**
   - *Issue:* The existing `validate` middleware factory only parsed `req.body`. Validating route parameters like `:boardId` required clean parameter handling without mutating `req.body`.
   - *Resolution:* Implemented `validateParams(schema)` in `validate.middleware.js`, paired with `boardIdParamSchema` in `board.validator.js` and internal service-level `validateObjectId` checks.
2. **Sandbox DNS SRV Timeout:**
   - *Issue:* Running commands inside the isolated sandbox timed out on MongoDB Atlas DNS SRV lookups (`querySrv ETIMEOUT`).
   - *Resolution:* Executed integration tests requiring external database connectivity with bypass sandbox permissions.

---

### 13. Remaining Risks
1. **Lack of Pagination for Boards:**
   `getUserBoards` currently returns all boards owned by a user without pagination. For users with large numbers of boards, query pagination (e.g. `limit` and `page`) will be beneficial in future iterations.
2. **Absence of Cascade Deletion for Upcoming Tasks:**
   When tasks and cards are implemented in future tasks, deleting a board must cascade to delete associated tasks and columns to avoid orphaned records in MongoDB.
3. **Absence of Rate Limiting:**
   Board endpoints are not rate-limited, relying on future reverse-proxy or middleware protection.

---

### 14. Recommended Next Task
**Task 6: Task and Card Model, Service, and Column Management**
1. Implement `backend/src/models/task.model.js` with fields: `title`, `description`, `boardId` (ref: `Board`), `columnKey` (enum: `todo`, `in-progress`, `done`), `order`, `dueDate`, `priority`, and timestamps.
2. Implement `backend/src/validators/task.validator.js` with Zod schemas for task creation, update, and moving between columns.
3. Implement `backend/src/services/task.service.js` with authorization checks (verifying the board belongs to the authenticated user before allowing task operations).
4. Implement `backend/src/controllers/task.controller.js` and `backend/src/routes/task.routes.js`.
5. Mount task routes in `backend/src/app.js` at `/api/v1/tasks` or `/api/v1/boards/:boardId/tasks`.

---

## Task 6: Task and Card Management

### 1. Initial Project State
Prior to Task 6:
- Foundational infrastructure (Tasks 1 & 2), user authentication with JWT and cookies (Tasks 3 & 4), and board management (Task 5) were fully implemented and verified.
- The board router was mounted at `/api/v1/boards`, enforcing ownership checks.
- However, prior to Task 6, no task or card management domain existed:
  - `backend/src/models/task.model.js` did not exist.
  - `backend/src/validators/task.validator.js` did not exist.
  - `backend/src/services/task.service.js` did not exist.
  - `backend/src/controllers/task.controller.js` did not exist.
  - `backend/src/routes/task.routes.js` did not exist.
  - Deleting a board in `board.service.js` did not clean up associated task records.
  - No nested task endpoints were mounted in `backend/src/app.js`.

---

### 2. Files Inspected
- `backend/src/app.js`
- `backend/src/models/board.model.js`
- `backend/src/models/user.model.js`
- `backend/src/services/board.service.js`
- `backend/src/validators/board.validator.js`
- `backend/src/middlewares/validate.middleware.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/routes/auth.routes.js`
- `backend/src/routes/board.routes.js`
- `backend/WORK_REPORT.md`

---

### 3. Files Created
- `backend/src/models/task.model.js` — Mongoose schema and model for tasks with `title`, `description`, `boardId`, `columnKey` (`todo`, `in-progress`, `done`), `order`, `priority` (`low`, `medium`, `high`), `dueDate`, and compound indexes for fast board/column ordering queries.
- `backend/src/validators/task.validator.js` — Zod schemas (`createTaskSchema`, `updateTaskSchema`, `moveTaskSchema`, `boardIdParamSchema`, `taskParamsSchema`) with strict unrecognized field rejection (`.strict()`).
- `backend/src/services/task.service.js` — Core business service (`taskService`) handling task creation, board-scoped retrieval, detail updates, movement/reordering, deletion, and cross-entity ownership authorization.
- `backend/src/controllers/task.controller.js` — Express controllers (`createTask`, `getBoardTasks`, `getTask`, `updateTask`, `moveTask`, `deleteTask`) wrapped with `asyncHandler` and returning standardized `ApiResponse`.
- `backend/src/routes/task.routes.js` — Express nested router with `mergeParams: true`, binding routes, parameter validation, body validation, authentication middleware, and controller methods.

---

### 4. Files Modified
- `backend/src/services/board.service.js` — Added cascade cleanup in `deleteBoard`: imports `Task` and executes `await Task.deleteMany({ boardId })` upon board deletion to prevent orphaned documents.
- `backend/src/routes/board.routes.js` — Nested task routes under `router.use("/:boardId/tasks", taskRouter)`.
- `backend/src/app.js` — Mounted `app.use("/api/v1/boards/:boardId/tasks", taskRouter)` to ensure direct nested route handling prior to `/api/v1/boards`.
- `backend/WORK_REPORT.md` — Appended Task 6 technical documentation.

---

### 5. Task Schema
Implemented in `backend/src/models/task.model.js`:

| Field | Type | Modifiers / Validations | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | `required`, `trim`, `minlength: 1`, `maxlength: 150` | Task title |
| `description` | `String` | `trim`, `maxlength: 2000`, `default: ""` | Optional task description |
| `boardId` | `Schema.Types.ObjectId` | `required`, `ref: 'Board'`, `index: true` | Parent board reference |
| `columnKey` | `String` | `required`, `enum: ['todo', 'in-progress', 'done']`, `default: 'todo'` | Target column status |
| `order` | `Number` | `required`, `min: 0`, `default: 0` | Numeric position within column |
| `priority` | `String` | `enum: ['low', 'medium', 'high']`, `default: 'medium'` | Priority level |
| `dueDate` | `Date` | `default: null` | Optional deadline timestamp |
| `timestamps` | `Boolean` | `createdAt`, `updatedAt` | Automatic entity timestamps |

**Indexes:**
- Compound index `{ boardId: 1, columnKey: 1, order: 1 }` for ordered column task queries.
- Compound index `{ boardId: 1, order: 1 }` for whole-board ordering scans.

---

### 6. API Endpoints

All endpoints are nested under `/api/v1/boards/:boardId/tasks` and protected by `verifyJWT`:

| Method | Endpoint | Protection | Validation | Purpose | Status Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | `validateParams(boardIdParamSchema)` + `validate(createTaskSchema)` | Create a new task under a board | `201 Created` |
| `GET` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | `validateParams(boardIdParamSchema)` | List all tasks on a board (optional `?columnKey=` filter) | `200 OK` |
| `GET` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | `validateParams(taskParamsSchema)` | Retrieve a single task by ID | `200 OK` |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | `validateParams(taskParamsSchema)` + `validate(updateTaskSchema)` | Update task details (`title`, `description`, `priority`, `dueDate`) | `200 OK` |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId/move` | `verifyJWT` | `validateParams(taskParamsSchema)` + `validate(moveTaskSchema)` | Move task to a column and/or reposition order | `200 OK` |
| `DELETE` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | `validateParams(taskParamsSchema)` | Delete a task | `200 OK` |

---

### 7. Authorization Approach
- **Strict Board Ownership Scoping:**
  - In `taskService.verifyBoardOwnership(boardId, userId)`, the service queries `Board.findOne({ _id: boardId, owner: userId })`.
  - If the board does not exist OR is owned by another user, the service immediately throws `ApiError(404, "Board not found")`.
- **Strict Task-to-Board Association:**
  - For operations on a task (`getTaskById`, `updateTask`, `moveTask`, `deleteTask`), the query enforces `{ _id: taskId, boardId }`.
  - If the task does not exist on that board (even if it exists on another board belonging to the same user), the service returns `ApiError(404, "Task not found")`.
- **No Client-Supplied Trust:**
  - Clients cannot pass `boardId` in request bodies. It is extracted strictly from the URL route parameters verified against the token identity.
  - Users cannot access, modify, move, or delete tasks belonging to other users.

---

### 8. Ordering Implementation
- **Automatic Appending on Creation:**
  - Newly created tasks query the maximum order in the target column (`findOne({ boardId, columnKey }).sort({ order: -1 })`) and assign `nextOrder = lastTask ? lastTask.order + 1 : 0`.
- **Movement Without Specified Order:**
  - When moving a task to a target column without providing an `order`, the task is appended to the bottom of the destination column (`order = maxOrder + 1`).
  - If the task moved from a different column, the source column is normalized (`0, 1, 2, ...`).
- **Movement With Target Order:**
  - When a target `order` is provided, the destination column tasks are fetched in ascending order, the moved task is spliced into position, and orders are updated in bulk (`bulkWrite`) ensuring contiguous integers (`0, 1, 2, ...`).
  - The source column (if different) is re-normalized.
- **Deletion Re-Normalization:**
  - Deleting a task triggers `normalizeColumnOrders` to close any order gap in the affected column.

---

### 9. Board Deletion Cleanup
- In `backend/src/services/board.service.js`, `deleteBoard` was updated:
  ```javascript
  const deletedBoard = await Board.findOneAndDelete({ _id: boardId, owner: userId });
  if (!deletedBoard) {
      throw new ApiError(404, "Board not found");
  }
  // Cascade cleanup: remove all tasks belonging to this board
  await Task.deleteMany({ boardId });
  ```
- Guaranteed prevention of orphaned task documents without requiring complex distributed transactions.

---

### 10. Dependencies Added
*No new external packages were added.*
The implementation relies entirely on existing dependencies:
- `mongoose` (`^9.11.4`)
- `express` (`^5.3.0`)
- `zod` (`^4.6.7`)
- `jsonwebtoken` (`^9.0.3`)

---

### 11. Commands Executed
1. `node --check ...` — Validated syntax across all 26 backend source files.
2. `cd backend; Get-Content .../scratch/test_task_management.js -Raw | node --input-type=module` — Executed full task integration test suite against live MongoDB Atlas (25 test cases).
3. `cd backend; Get-Content .../scratch/test_board_management.js -Raw | node --input-type=module` — Executed board management regression suite.
4. `cd backend; Get-Content .../scratch/test_auth_system.js -Raw | node --input-type=module` — Executed authentication regression suite.

---

### 12. Tests Performed and Actual Results
All 25 targeted test scenarios passed against live MongoDB Atlas:
1. **Authenticated Task Creation:** Status 201; returns task object.
2. **Board ID Assignment:** Task is correctly linked to parent board (`boardId`).
3. **Default Column Assignment:** Task defaults to `todo` column when omitted.
4. **Default Priority Assignment:** Task priority defaults to `medium`.
5. **Sequential Order Assignment:** First task gets order 0, second gets order 1, third gets order 2; first in-progress gets order 0.
6. **Board Task Listing:** Lists all tasks for the board (Status 200).
7. **Sorting Verification:** Tasks sorted by column and order ascending.
8. **Column Filtering:** `?columnKey=todo` returns 3 tasks; `in-progress` returns 1; `done` returns 0.
9. **Single Task Retrieval:** Returns requested task matching title and description.
10. **Title and Description Update:** Updates saved and persisted in MongoDB.
11. **Priority and Due Date Update:** Priority updated to `high`; `dueDate` stored as Date object.
12. **Move to In Progress:** Status 200; columnKey updated; appended with order 1.
13. **Move to Done:** Status 200; columnKey updated to `done` with order 0.
14. **Move Appending vs Targeted Order:** Moving without order appends; moving with `order: 0` prepends and re-indexes contiguous orders (0, 1, 2).
15. **Task Deletion:** Status 200; task removed from MongoDB; subsequent fetch returns 404.
16. **Unauthenticated Request Rejection:** All 6 task endpoints reject missing auth with 401.
17. **Invalid ID Rejection:** Malformed board or task ObjectIds rejected with 400.
18. **Cross-User Board Access Prevention:** User A attempting to list or create tasks on User B's board receives 404.
19. **Cross-User Task Access Prevention:** User A attempting to view, update, move, or delete User B's task receives 404 (User B's task remains untouched).
20. **Cross-Board Mismatch Prevention:** Accessing a task using a different board ID owned by the same user returns 404.
21. **Column Key Validation:** Invalid column keys rejected on create, move, and query filter (400).
22. **Priority Validation:** Invalid priorities rejected on create and update (400).
23. **Input Validation Constraints:** Empty titles, whitespace titles, titles > 150 chars, descriptions > 2000 chars, invalid dates, body `boardId`, body `order`, and empty update payloads rejected with 400.
24. **Cascade Cleanup on Board Deletion:** Deleting a board automatically deletes all associated tasks in MongoDB (count drops from 3 to 0).
25. **Regression Verification:** Authentication (`/me`) and board listing (`/boards`) verified fully functional.
26. **Teardown:** Verified 0 test users, boards, or tasks remaining in Atlas.

---

### 13. Tests Not Performed
1. **Frontend UI Drag-and-Drop Tests:** Frontend client is not yet built (out of scope).
2. **Automated Continuous Integration Runner (`npm test`):** Automated test framework (Jest/Vitest) is not yet configured in `package.json`.

---

### 14. Issues Encountered
1. **Express Nested Route Parameter Merging:**
   - *Issue:* Express routers by default do not preserve parent route parameters (`:boardId`) when mounted as sub-routers.
   - *Resolution:* Configured `Router({ mergeParams: true })` in `task.routes.js` and mounted directly in `app.js` and `board.routes.js`, ensuring `req.params.boardId` is accessible across all controller handlers.
2. **Dual-Column Order Normalization on Move:**
   - *Issue:* Moving a task from column A to column B leaves an order gap in column A and requires order insertion in column B.
   - *Resolution:* Implemented `normalizeColumnOrders` helper executed on both source and destination columns during movement and deletion.

---

### 15. Remaining Risks
1. **Concurrency During High-Frequency Simultaneous Moves:**
   Order normalization in a column uses sequential find and bulk write. Under extremely high concurrent write loads on the exact same column, optimistic concurrency or atomic list operations may be considered in future releases.
2. **Missing Advanced Task Features:**
   Task assignment, labels, attachments, activity history, and comments are not yet supported (as per current MVP scope).

---

### 16. Recommended Next Task
**Task 7: Automated Test Framework Setup & Comprehensive CI Suite**
1. Install testing framework dependencies (`vitest` or `jest`, and `supertest`).
2. Configure `package.json` test scripts (`npm test`).
3. Convert scratch test suites into formal integration and unit test specifications under `backend/tests/`.
4. Implement GitHub Actions or CI pipeline configurations.



---

# Task 7: Automated Backend Testing

## 1. Initial Project State
- Express 5.x application with ES modules (`type: "module"`).
- User authentication complete with access and refresh tokens, bcrypt password hashing, and HttpOnly cookies.
- Board management complete with default immutable columns (`todo`, `in-progress`, `done`) and user ownership isolation.
- Task management complete with CRUD, column movement, order re-indexing, and cascade deletion.
- Request validation implemented via Zod schemas and middleware.
- Standalone scratch scripts existed in the scratch directory (`test_auth_system.js`, `test_cookie_auth.js`, `test_board_management.js`, `test_task_management.js`).
- `npm test` was unconfigured (`echo "Error: no test specified" && exit 1`).
- Task routes had redundant duplicate mounting in both `app.js` and `board.routes.js`.

## 2. Files Inspected
- `backend/package.json` — verified scripts and dependencies.
- `backend/package-lock.json` — inspected dependency tree.
- `backend/.env` and `backend/.env.example` — inspected environment variable structure.
- `backend/src/app.js` — identified redundant task route mounting.
- `backend/src/index.js` — verified entry point and server startup.
- `backend/src/constants.js` — verified default DB_NAME (`devflow`).
- `backend/src/db/index.js` — reviewed MongoDB connection logic.
- `backend/src/routes/auth.routes.js` — confirmed route paths and HTTP methods (`DELETE /logout`).
- `backend/src/routes/board.routes.js` — confirmed nested route structure (`/:boardId/tasks`).
- `backend/src/routes/task.routes.js` — verified parameter merging (`mergeParams: true`) and controller bindings.
- `backend/src/controllers/auth.controller.js`, `board.controller.js`, `task.controller.js` — verified response codes and payloads.
- `backend/src/services/auth.service.js`, `board.service.js`, `task.service.js` — verified business logic, error throwing, and database queries.
- Scratch scripts:
  - `test_auth_system.js`
  - `test_cookie_auth.js`
  - `test_board_management.js`
  - `test_task_management.js`

## 3. Files Created
- `backend/vitest.config.js` — Vitest configuration file specifying node environment, setup files, timeouts, and sequential execution (`fileParallelism: false`).
- `backend/tests/setup.js` — Global test lifecycle hooks: loads environment variables, validates test DB name, connects to dedicated test database, validates connection host, and ensures teardown.
- `backend/tests/helpers.js` — Shared testing utilities including `cleanDatabase()`, `createTestUser()`, `createTestBoard()`, `createTestTask()`, and `getCookieValue()`.
- `backend/tests/auth.test.js` — Comprehensive automated test suite for registration, login, token rotation, cookies, `/me`, and logout.
- `backend/tests/board.test.js` — Comprehensive automated test suite for board CRUD, column protection, cascade cleanup, and cross-user authorization.
- `backend/tests/task.test.js` — Comprehensive automated test suite for task CRUD, movement, ordering, column filtering, parameter validations, and cross-board/cross-user isolation.

## 4. Files Modified
- `backend/package.json` — updated `scripts.test` to `"vitest run"` and added devDependencies.
- `backend/package-lock.json` — lockfile updated with installed devDependencies.
- `backend/.env.example` — added `TEST_DB_NAME=devflow_test` documentation.
- `backend/.env` — configured `TEST_DB_NAME=devflow_test`.
- `backend/src/app.js` — removed duplicate `taskRouter` import and redundant `app.use("/api/v1/boards/:boardId/tasks", taskRouter)` mount.

## 5. Dependencies Added
- `vitest` (`^5.0.5`) — Modern, fast ESM test runner.
- `supertest` (`^7.3.1`) — High-level HTTP testing library for Express applications.
- `@rolldown/binding-win32-x64-msvc` — Platform-specific native binary required on Windows x64 environments.

## 6. Test Configuration
- **Test Runner:** Vitest (`vitest run`).
- **Configuration File:** `backend/vitest.config.js`.
- **Environment:** Node.js.
- **Execution Strategy:** `fileParallelism: false` to ensure test files run sequentially against the database, preventing race conditions or interleaved data mutations.
- **Timeouts:** 30,000ms for test execution and lifecycle hooks to accommodate cloud Atlas database network latencies.
- **Database Safety Guard:**
  - Tests connect strictly to `TEST_DB_NAME` (defaults to `devflow_test`).
  - Active connection name is verified against `TEST_DB_NAME`.
  - Hard guard fails immediately if connection attempts to use `devflow` or `production`.
  - Database cleanup (`cleanDatabase()`) is strictly conditioned on `mongoose.connection.name === TEST_DB_NAME`.

## 7. Test Coverage
A total of 52 automated tests organized across three dedicated suites:
1. **Authentication Suite (`tests/auth.test.js` — 18 tests):**
   - User registration with valid data, tokens, and HttpOnly cookies.
   - Rejection of duplicate username (`409 Conflict`).
   - Rejection of duplicate email (`409 Conflict`).
   - Validation rejection on short/malformed data (`400 Bad Request`).
   - Login with valid credentials returning tokens and HttpOnly cookies (`200 OK`).
   - Rejection of incorrect password (`401 Unauthorized`).
   - Rejection of non-existent email (`401 Unauthorized`).
   - Validation rejection on missing login fields (`400 Bad Request`).
   - Protected `/me` access using Bearer token header (`200 OK`).
   - Protected `/me` access using `accessToken` cookie (`200 OK`).
   - Rejection of unauthenticated `/me` request (`401 Unauthorized`).
   - Rejection of malformed / invalid JWT access token (`401 Unauthorized`).
   - Refresh token rotation issuing new token pair and updating DB hash (`200 OK`).
   - Refresh token rotation using `refreshToken` cookie (`200 OK`).
   - Replay protection rejecting previously rotated refresh token (`401 Unauthorized`).
   - Rejection of missing refresh token (`400 Bad Request`).
   - Rejection of malformed/invalid refresh token (`401 Unauthorized`).
   - Logout clearing DB refresh token hash and invalidating cookies (`200 OK`).
   - Rejection of unauthenticated logout attempt (`401 Unauthorized`).

2. **Board Suite (`tests/board.test.js` — 14 tests):**
   - Board creation linking to authenticated user and generating default columns in exact sequence (`todo: 0`, `in-progress: 1`, `done: 2`) (`201 Created`).
   - Validation rejection of empty or missing board title (`400 Bad Request`).
   - Rejection of unauthenticated board creation (`401 Unauthorized`).
   - Listing boards strictly scoped to authenticated owner (`200 OK`).
   - Rejection of unauthenticated board listing (`401 Unauthorized`).
   - Retrieval of single board by owner (`200 OK`).
   - Cross-user isolation: rejecting retrieval of another user's board (`404 Not Found`).
   - Validation rejection of non-ObjectId board ID (`400 Bad Request`).
   - Rejection of non-existent board ID (`404 Not Found`).
   - Updating board title and description (`200 OK`).
   - Protecting default columns against tampering or modification on board update.
   - Cross-user isolation: rejecting update of another user's board (`404 Not Found`).
   - Deleting board with cascade cleanup of associated tasks (`200 OK`).
   - Cross-user isolation: rejecting deletion of another user's board (`404 Not Found`).

3. **Task Suite (`tests/task.test.js` — 20 tests):**
   - Creating tasks with default column (`todo`), default priority (`medium`), and auto-incrementing sequential orders (`0, 1, ...`) (`201 Created`).
   - Validation rejection of empty task title (`400 Bad Request`).
   - Validation rejection of title exceeding 150 characters (`400 Bad Request`).
   - Validation rejection of description exceeding 2000 characters (`400 Bad Request`).
   - Validation rejection of client attempting to inject `boardId` or `order` in payload (`400 Bad Request`).
   - Cross-user isolation: rejecting task creation under another user's board (`404 Not Found`).
   - Rejection of unauthenticated task creation (`401 Unauthorized`).
   - Listing board tasks sorted ascending by column and order (`200 OK`).
   - Filtering tasks by columnKey query parameter (`?columnKey=todo`, `?columnKey=in-progress`) (`200 OK`).
   - Cross-user isolation: rejecting task listing for another user's board (`404 Not Found`).
   - Retrieving a single task by ID (`200 OK`).
   - Task-to-board mismatch prevention: rejecting retrieval when task does not belong to specified board (`404 Not Found`).
   - Validation rejection of non-ObjectId task ID (`400 Bad Request`).
   - Updating task details (title, description, priority) without altering columnKey or order (`200 OK`).
   - Validation rejection of invalid priority values (`400 Bad Request`).
   - Moving task between columns with automatic appending (`200 OK`).
   - Reordering task within a column with contiguous re-indexing (`200 OK`).
   - Validation rejection of moving task to an invalid column (`400 Bad Request`).
   - Deleting a task with automatic re-indexing of remaining column tasks (`200 OK`).
   - Cross-user isolation: rejecting task deletion by non-owner (`404 Not Found`).

## 8. Exact Commands Executed
- `npm install -D vitest supertest` — installed testing framework and Supertest.
- `npm i -D @rolldown/binding-win32-x64-msvc` — installed Windows-compatible rolldown native binding.
- `node -c ...` — syntax check across all source and test files.
- `cd backend; npm test` — executed complete automated test suite via Vitest.

## 9. Actual Test Results
- **Test Runner:** Vitest v5.0.5.
- **Database Used:** `devflow_test` (MongoDB Atlas dedicated test database).
- **Test Files:** 3 passed (3 total).
- **Total Tests:** 52 passed (52 total).
- **Failed Tests:** 0.
- **Skipped Tests:** 0.
- **Execution Time:** ~23–32 seconds.

## 10. Bugs Discovered and Fixed
1. **Duplicate Route Mounting in Express:**
   - *Discovery:* `app.js` mounted `app.use("/api/v1/boards/:boardId/tasks", taskRouter)` and `board.routes.js` mounted `router.use("/:boardId/tasks", taskRouter)`.
   - *Fix:* Removed duplicate mount from `app.js`, establishing a single clean routing delegation hierarchy through `board.routes.js`.
2. **Missing Windows Rolldown Native Binding:**
   - *Discovery:* Vitest v5 on Windows x64 required `@rolldown/binding-win32-x64-msvc` to resolve native bundling.
   - *Fix:* Added `@rolldown/binding-win32-x64-msvc` to `devDependencies`.

## 11. Remaining Limitations
1. **Cloud Database Network Latency:**
   Tests execute against a cloud-hosted MongoDB Atlas instance (`devflow_test`). While functional and thorough, cloud network round-trips result in a ~25-second suite runtime. A local MongoDB instance or `mongodb-memory-server` can be introduced in future environments to accelerate local test cycles.
2. **No Frontend UI Testing:**
   Tests currently cover backend REST APIs exclusively. Frontend component and user interaction testing will be established once the React frontend is implemented.
3. **CI/CD Pipeline Integration:**
   Automated testing currently executes locally; GitHub Actions workflow integration will be configured in a subsequent task.

## 12. Recommended Next Task
**Task 8: Continuous Integration (CI) and Frontend Initialization**
1. Configure GitHub Actions workflow to run `npm test` automatically on push and pull requests.
2. Initialize the React frontend application (Vite + Tailwind CSS).
3. Establish shared TypeScript/JavaScript API client contracts and environment setup.

---

# Task 8: Backend API Documentation

## 1. Files Inspected
- `backend/package.json` — verified scripts, ESM configuration, and production/dev dependencies.
- `backend/src/app.js` — verified CORS origin configuration, body parser limits, cookie parser middleware, route mounting (`/api/v1/auth`, `/api/v1/boards`), 404 handler, and centralized error handler.
- `backend/src/index.js` — verified server startup port configuration and database connection lifecycle.
- `backend/src/constants.js` — verified default DB_NAME (`devflow`).
- `backend/src/routes/auth.routes.js` — verified authentication route paths, HTTP methods (`POST /register`, `POST /login`, `POST /refresh-token`, `DELETE /logout`, `GET /me`), and route middlewares.
- `backend/src/routes/board.routes.js` — verified board routes, route parameter validation, and nested task router delegation (`router.use("/:boardId/tasks", taskRouter)`).
- `backend/src/routes/task.routes.js` — verified task route paths, `mergeParams: true`, parameter validation schemas, and controller bindings.
- `backend/src/controllers/auth.controller.js` — verified cookie options (`httpOnly: true`, `secure`, `sameSite`, `maxAge`), status codes (`201 Created`, `200 OK`), and response bodies.
- `backend/src/controllers/board.controller.js` — verified board handler signatures, status codes (`201 Created`, `200 OK`), and response payloads.
- `backend/src/controllers/task.controller.js` — verified task handler signatures, status codes, query parameter parsing (`columnKey || column`), and response payloads.
- `backend/src/services/auth.service.js` — verified registration checks, bcrypt comparison, token generation, SHA-256 refresh token hashing, atomic token rotation via `findOneAndUpdate`, `$unset` logout logic, and profile fetching.
- `backend/src/services/board.service.js` — verified board creation with 3 immutable default columns, ownership scoping, update rules, and cascade task cleanup upon board deletion.
- `backend/src/services/task.service.js` — verified board ownership verification, auto-incrementing sequential orders, column filtering, task detail update restrictions, append/insert move logic, and contiguous order normalization.
- `backend/src/models/user.model.js` — verified User schema, bcrypt pre-save hook, JWT generators, SHA-256 hash method, and constant-time refresh token comparison.
- `backend/src/models/board.model.js` — verified Board schema and `DEFAULT_COLUMNS` (`todo: 0`, `in-progress: 1`, `done: 2`).
- `backend/src/models/task.model.js` — verified Task schema, `TASK_COLUMNS`, `TASK_PRIORITIES`, default values, and compound indexes.
- `backend/src/validators/auth.validator.js` — verified `registerSchema`, `loginSchema`, and `refreshTokenSchema`.
- `backend/src/validators/board.validator.js` — verified `createBoardSchema`, `updateBoardSchema`, and `boardIdParamSchema`.
- `backend/src/validators/task.validator.js` — verified `createTaskSchema`, `updateTaskSchema`, `moveTaskSchema`, `boardIdParamSchema`, and `taskParamsSchema`.
- `backend/src/middlewares/auth.middleware.js` — verified token extraction from cookies (`req.cookies.accessToken`) or Authorization header (`Bearer <token>`), JWT verification, and `req.user` assignment.
- `backend/src/middlewares/validate.middleware.js` — verified `validate` and `validateParams` factories mapping Zod issues to `ApiError(400, "Validation Error", errors)`.
- `backend/src/middlewares/error.middleware.js` — verified error formatting (`statusCode`, `success: false`, `message`, `errors`, and environment-specific `stack`).
- `backend/src/middlewares/notFound.middleware.js` — verified 404 error generation for unmatched routes.
- `backend/src/utils/ApiResponse.js` — verified standardized success response structure (`statusCode`, `data`, `message`, `success: true`).
- `backend/src/utils/ApiError.js` — verified custom operational error class.
- `backend/.env.example` — verified environment variable definitions.
- `backend/WORK_REPORT.md` — reviewed historical task documentation.

## 2. Files Created or Modified
- **Created:** `backend/README.md` — comprehensive, 1200+ line technical API reference and frontend integration manual.
- **Modified:** `backend/WORK_REPORT.md` — appended this Task 8 technical documentation section.

## 3. API Groups Documented
1. **Authentication API Group (`/api/v1/auth`):** 5 endpoints.
2. **Board Management API Group (`/api/v1/boards`):** 5 endpoints.
3. **Task & Card Management API Group (`/api/v1/boards/:boardId/tasks`):** 6 endpoints.

## 4. Number of Endpoints Documented
- **Total Implemented Endpoints Documented:** **16 endpoints**.
- Authentication:
  1. `POST /api/v1/auth/register`
  2. `POST /api/v1/auth/login`
  3. `POST /api/v1/auth/refresh-token`
  4. `DELETE /api/v1/auth/logout`
  5. `GET /api/v1/auth/me`
- Board Management:
  6. `POST /api/v1/boards`
  7. `GET /api/v1/boards`
  8. `GET /api/v1/boards/:boardId`
  9. `PATCH /api/v1/boards/:boardId`
  10. `DELETE /api/v1/boards/:boardId`
- Task Management:
  11. `POST /api/v1/boards/:boardId/tasks`
  12. `GET /api/v1/boards/:boardId/tasks`
  13. `GET /api/v1/boards/:boardId/tasks/:taskId`
  14. `PATCH /api/v1/boards/:boardId/tasks/:taskId`
  15. `PATCH /api/v1/boards/:boardId/tasks/:taskId/move`
  16. `DELETE /api/v1/boards/:boardId/tasks/:taskId`

## 5. Authentication Documentation Completed
- Documented dual-token strategy: short-lived access tokens (1 day) and longer-lived refresh tokens (10 days).
- Documented SHA-256 database hashing of refresh tokens and constant-time verification.
- Documented supported client transport channels:
  - HttpOnly cookies (`accessToken`, `refreshToken`) with production-aware `secure` and `sameSite` flags.
  - Standard `Authorization: Bearer <accessToken>` header.
- Documented refresh token rotation with replay protection and race-condition prevention.
- Documented logout behavior: `$unset: { refreshToken: 1 }` in MongoDB and clearing of cookies.

## 6. Request and Response Documentation Completed
- Documented complete endpoint paths, HTTP verbs, and authentication requirements for all 16 endpoints.
- Path parameters documented with data type, requirement flag, and ObjectId validation constraints.
- Query parameters documented (e.g. `columnKey` filtering on task listing).
- Request payloads documented with field names, types, constraints, default values, strict disallowances, and valid JSON examples.
- Standard success response structure documented: `statusCode`, `data`, `message`, `success: true`.
- Real-world, syntactically valid JSON success response examples provided for every endpoint.

## 7. Error Response Documentation Completed
- Standard error response structure documented: `statusCode`, `success: false`, `message`, `errors: [...]`, and development-only `stack`.
- Error conditions and status codes documented for each endpoint:
  - `400 Bad Request`: Zod validation errors, invalid ObjectIds, empty payloads, disallowed fields.
  - `401 Unauthorized`: Missing tokens, expired tokens, invalid credentials, replay of rotated refresh tokens.
  - `404 Not Found`: Non-existent boards, non-existent tasks, cross-user isolation blocks, task-to-board mismatches.
  - `409 Conflict`: Duplicate username or email on registration.
  - `500 Internal Server Error`: Unhandled operational exceptions.

## 8. Verification Performed
- Validated all 31 JSON code blocks in `backend/README.md` using Node.js `JSON.parse` to ensure 100% syntactical validity.
- Compared every endpoint path and method against actual Express route files (`auth.routes.js`, `board.routes.js`, `task.routes.js`).
- Verified request constraints against Zod schemas (`auth.validator.js`, `board.validator.js`, `task.validator.js`).
- Confirmed environment variables against `src/index.js`, `src/db/index.js`, `src/app.js`, `src/models/user.model.js`, and `tests/setup.js`.
- Verified that all 52 automated tests in the test suite continue to pass (`npm test`).

## 9. Missing or Unclear Implementation Details
- None. The backend implementation has clear separation of concerns, exhaustive input validation, consistent error and success structures, and complete automated test coverage across all endpoints.

## 10. Recommended Next Task
**Task 9: Frontend Initialization and Authentication Integration**
1. Initialize Vite React client with Tailwind CSS in `frontend/`.
2. Configure Axios client instance with `withCredentials: true` and automatic 401 refresh token interceptor as documented in `backend/README.md`.
3. Implement user registration and login forms with client-side validation.
4. Implement protected routing for dashboard and board views.

---

## Task 8.1: API Documentation Completion

### 1. What Was Incomplete
- **Endpoint Request Headers & Error Responses:** While the initial documentation listed all 16 endpoints with request schemas and success responses, several board and task endpoints only summarized error codes in text bullets without providing complete, copy-pasteable JSON error response payloads matching the centralized `errorHandler` contract.
- **Frontend Integration Guide:** The initial draft provided only a skeleton Axios instance (`apiClient.js`) without concrete, modular service functions for Authentication, Board CRUD, Task CRUD, Task Movement, form error extraction, or session expiration handling.
- **Workflow Walkthrough:** The initial workflow was compressed into 3 multi-command curl blocks rather than providing a structured, step-by-step walkthrough of all 12 discrete lifecycle actions requested (Register/Login, Current User `/me`, Create Board, List Boards, Create Task, List Tasks, Update Task, Move Task, Delete Task, Delete Board, Refresh Token, Logout).
- **Getting Started & Setup:** Missing explicit step-by-step installation instructions, environment setup guide, nodemon development startup, production startup, and testing instructions.
- **Automated Testing Suite Documentation:** The testing section lacked detailed documentation on the test configuration (`vitest.config.js`), database safety isolation guards (`devflow_test`), and the 52-test coverage distribution.

### 2. What Sections Were Completed
1. **Getting Started and Installation:** Comprehensive prerequisite check, `npm install`, `.env` setup, `npm run dev` (nodemon), `npm start` (node), and `npm test` instructions.
2. **Request Headers on All Endpoints:** Documented explicit HTTP request headers (`Content-Type: application/json`, `Authorization: Bearer <accessToken>`, and Cookie transport) for every single endpoint.
3. **Comprehensive JSON Error Responses:** Added full, syntactically valid JSON error response bodies for all endpoints covering 400 Bad Request, 401 Unauthorized, 404 Not Found, and 409 Conflict matching the real `errorHandler` middleware format (`{ statusCode, success: false, message, errors: [] }`).
4. **Complete Frontend Integration Guide:**
   - Full `apiClient.js` with `withCredentials: true` and 401 auto-retry refresh token interceptor.
   - Complete `authService.js` (register, login, refreshToken, logout, getCurrentUser).
   - Complete `boardService.js` (getBoards, getBoardById, createBoard, updateBoard, deleteBoard).
   - Complete `taskService.js` (getBoardTasks, getTaskById, createTask, updateTask, moveTask, deleteTask).
   - Standardized `extractErrorMessage(error)` helper function.
5. **Full 12-Step End-to-End Workflow Walkthrough:** Detailed sequential guide with curl commands and cookie jars (`cookies.txt`) covering:
   - Step 1: Register User Account
   - Step 2: Fetch Current Authenticated User (`/me`)
   - Step 3: Create a Board
   - Step 4: List Boards
   - Step 5: Create a Task in "Todo"
   - Step 6: Fetch All Tasks on the Board
   - Step 7: Update Task Details
   - Step 8: Move Task to "In Progress"
   - Step 9: Delete Task
   - Step 10: Delete Board
   - Step 11: Refresh Authentication Tokens
   - Step 12: Logout
6. **Automated Testing Suite Section:** Thorough documentation of Vitest v5, Supertest v7, serial execution (`fileParallelism: false`), database isolation safety guards (`devflow_test`), and full 52-test coverage breakdown.

### 3. Which Endpoints Were Documented or Corrected
All 16 implemented endpoints across the 3 API groups were updated to include explicit request headers, parameter schemas, complete request bodies, success response payloads, and full error response JSON examples:
- **Authentication Group (5 endpoints):**
  1. `POST /api/v1/auth/register`
  2. `POST /api/v1/auth/login`
  3. `POST /api/v1/auth/refresh-token`
  4. `DELETE /api/v1/auth/logout`
  5. `GET /api/v1/auth/me`
- **Board Management Group (5 endpoints):**
  6. `POST /api/v1/boards`
  7. `GET /api/v1/boards`
  8. `GET /api/v1/boards/:boardId`
  9. `PATCH /api/v1/boards/:boardId`
  10. `DELETE /api/v1/boards/:boardId`
- **Task & Card Management Group (6 endpoints):**
  11. `POST /api/v1/boards/:boardId/tasks`
  12. `GET /api/v1/boards/:boardId/tasks`
  13. `GET /api/v1/boards/:boardId/tasks/:taskId`
  14. `PATCH /api/v1/boards/:boardId/tasks/:taskId`
  15. `PATCH /api/v1/boards/:boardId/tasks/:taskId/move`
  16. `DELETE /api/v1/boards/:boardId/tasks/:taskId`

### 4. Documentation Verification Performed
- **Automated JSON Verification:** Executed a Node.js verification script across all 57 JSON code blocks in `backend/README.md`. Every block passed `JSON.parse` with 100% syntactical validity.
- **Table of Contents Integrity Check:** Executed an automated TOC link audit verifying that all 29 anchor links in the Table of Contents resolve to exact matching Markdown headings in the document.
- **Route & Controller Audit:** Verified all 16 endpoints against `backend/src/routes/`, `backend/src/controllers/`, `backend/src/services/`, and `backend/src/validators/`.
- **Live Automated Test Run:** Executed `npm test` against the isolated `devflow_test` database. All 52 tests passed cleanly (18 auth tests, 14 board tests, 20 task tests; 0 failed, 0 skipped).

### 5. Remaining Limitations
- **Backend-Only Scope:** The backend is fully documented and tested; frontend implementation in `frontend/` has not yet been initiated.
- **Cloud Latency:** Tests connect to MongoDB Atlas; remote DNS and TLS round-trips require ~25-60 seconds to execute the entire 52-test serial suite.

### 6. Files Created or Modified
- `backend/README.md` — Extended and completed with installation, headers, complete JSON error responses, modular frontend API client services, 12-step workflow, and testing docs (now 1330+ lines).
- `backend/WORK_REPORT.md` — Appended this Task 8.1 documentation update section.


---

## Task 8.2: Complete Detailed API Endpoint Documentation

### 1. Initial State & Deficiencies Identified
Prior to Task 8.2, while `backend/README.md` contained comprehensive architecture guides, environment setup, and integration instructions, an in-depth audit against the mandatory documentation specifications revealed the following deficiencies across the individual endpoint sections:
1. **Missing Schema Table Columns:**
   - Parameter and request body tables lacked the mandatory 6-column format: `| Field | Type | Required | Default | Validation / Constraints | Description |`.
   - In particular, the `Default` column was omitted across all endpoints, obscuring critical default values (such as `order: 0`, `priority: "medium"`, and `description: ""`).
2. **Incomplete Error Response Coverage:**
   - Several Board and Task endpoint sections summarized secondary error scenarios (such as `400 Bad Request` on invalid ObjectIds, `404 Not Found` cross-user isolation rejections, or `400 Bad Request` on invalid enum values) in bulleted text summaries rather than providing dedicated `##### Error: <Code> <Name>` subsections with explanatory text and complete, copy-pasteable JSON error payloads matching `errorHandler`.
3. **Table of Contents Anchor Slug Drift:**
   - Several Table of Contents anchor links contained slug discrepancies due to parenthetical HTTP verbs (e.g., `#81-register-user-post`), causing anchor mismatch with standard GitHub-flavored Markdown heading anchors.

---

### 2. What Was Completed in Task 8.2
1. **Full Standardization of All 16 Endpoint Sections:**
   Every single one of the 16 backend API endpoints was upgraded to adhere strictly to the mandatory 5-part structure:
   - **Subsection A (Endpoint Information):** Formal Name, HTTP Method, Complete URL, Authentication Requirement, Purpose & Functionality, and Detailed Business Logic & Side Effects.
   - **Subsection B (Request Information):** Required Request Headers, Auth Headers/Cookies, Path Parameters table (6 columns), Query Parameters table (6 columns), and Request Body table (6 columns) with explicit `Default` values documented.
   - **Subsection C (Request Example):** Syntactically valid JSON request payloads with realistic mock data, or explicit HTTP request call format for endpoints without request bodies.
   - **Subsection D (Success Response):** Exact HTTP Status Code, Response Headers/Cookies, Content Description, and complete JSON response body adhering to `ApiResponse({ statusCode, data, message, success: true })`.
   - **Subsection E (Error Responses):** Individual `##### Error: <Code> <Name>` subsections for every error condition, explaining why the error occurs, stating the backend message, and providing the full JSON response body matching `errorHandler({ statusCode, success: false, message, errors: [] })`.
2. **Strict 6-Column Format Across All Parameter and Payload Tables:**
   Standardized every table in Sections 8, 9, and 10 to:
   `| Field | Type | Required | Default | Validation / Constraints | Description |`
   Documented explicit defaults for optional fields (e.g., `priority: "medium"`, `order: 0`, `description: ""`) and explicit `None` for required or path-bound fields.
3. **Comprehensive Individual Error Response Blocks:**
   Expanded all error sections into discrete `##### Error: <Code> <Name>` blocks containing:
   - Detailed condition description (e.g., unauthenticated session, invalid ObjectId format, missing required fields, cross-user board ownership violation, foreign task-to-board access attempt, refresh token replay detection).
   - Exact error message string emitted by the backend.
   - Complete, copy-pasteable JSON error response payload.
4. **Table of Contents Anchor Synchronization:**
   Re-indexed all 29 Table of Contents links in `backend/README.md` to ensure seamless navigation across all 13 major sections and 16 individual API endpoints.

---

### 3. Total Endpoints Documented (All 16 Endpoints)
All 16 backend API endpoints currently implemented in the codebase are exhaustively documented:

#### Authentication API Group (`/api/v1/auth`) — 5 Endpoints
1. `POST /api/v1/auth/register` (8.1) — Register User
2. `POST /api/v1/auth/login` (8.2) — Login User
3. `POST /api/v1/auth/refresh-token` (8.3) — Refresh Access Token
4. `DELETE /api/v1/auth/logout` (8.4) — Logout User
5. `GET /api/v1/auth/me` (8.5) — Get Current User Profile

#### Board Management API Group (`/api/v1/boards`) — 5 Endpoints
6. `POST /api/v1/boards` (9.1) — Create Board
7. `GET /api/v1/boards` (9.2) — List User Boards
8. `GET /api/v1/boards/:boardId` (9.3) — Get Board by ID
9. `PATCH /api/v1/boards/:boardId` (9.4) — Update Board
10. `DELETE /api/v1/boards/:boardId` (9.5) — Delete Board (Cascading)

#### Task and Card Management API Group (`/api/v1/boards/:boardId/tasks`) — 6 Endpoints
11. `POST /api/v1/boards/:boardId/tasks` (10.1) — Create Task
12. `GET /api/v1/boards/:boardId/tasks` (10.2) — List Board Tasks (with column filtering)
13. `GET /api/v1/boards/:boardId/tasks/:taskId` (10.3) — Get Task by ID
14. `PATCH /api/v1/boards/:boardId/tasks/:taskId` (10.4) — Update Task Details
15. `PATCH /api/v1/boards/:boardId/tasks/:taskId/move` (10.5) — Move / Reorder Task
16. `DELETE /api/v1/boards/:boardId/tasks/:taskId` (10.6) — Delete Task (with contiguous re-indexing)

---

### 4. Completed Sections in `backend/README.md`
The final `backend/README.md` document spans 1,330+ lines and contains 13 fully realized sections:
- **Section 1: Project Overview & Tech Stack** — Core purpose, design ethos, full architectural tech stack.
- **Section 2: Getting Started & Installation** — Prerequisites, step-by-step installation, development script (`npm run dev`), production startup (`npm start`), and test command (`npm test`).
- **Section 3: Environment Configuration** — Complete reference table documenting all 9 environment variables.
- **Section 4: Architecture & Design Principles** — Layered unidirectional flow diagram, separation of concerns, and security design.
- **Section 5: Authentication & Security Mechanism** — Dual-token flow, SHA-256 database hashing, HttpOnly cookie security, atomic single-use rotation, and logout token invalidation.
- **Section 6: Standard API Response Format** — Standardized success envelope (`ApiResponse`) and centralized error envelope (`errorHandler`).
- **Section 7: Complete API Summary Table** — Matrix of all 16 endpoints with methods, URLs, auth requirements, and descriptions.
- **Section 8: Authentication API Group** — Detailed documentation for all 5 auth endpoints (8.1 through 8.5).
- **Section 9: Board Management API Group** — Detailed documentation for all 5 board endpoints (9.1 through 9.5).
- **Section 10: Task and Card Management API Group** — Detailed documentation for all 6 task endpoints (10.1 through 10.6).
- **Section 11: Frontend Integration Guide** — Production-ready Axios instance with automatic 401 token refresh interceptor, complete modular services (`authService.js`, `boardService.js`, `taskService.js`), error extraction utility, and session handling guide.
- **Section 12: End-to-End Workflow Walkthrough** — 12-step sequential curl walkthrough utilizing a persistent cookie jar (`cookies.txt`).
- **Section 13: Automated Testing Suite** — Vitest & Supertest setup, dedicated test database safety isolation (`devflow_test`), test execution instructions, and test coverage breakdown.

---

### 5. Verification Performed
1. **Automated JSON Code Block Syntax Validation:**
   - Ran an automated Node.js script using `JSON.parse` across all 57 JSON blocks in `backend/README.md`.
   - Result: 100% of JSON blocks (request examples, success responses, and error payloads) are syntactically valid JSON.
2. **Table of Contents Integrity Check:**
   - Ran an automated Node.js script matching every TOC link against the heading slug generation rules.
   - Result: All 29 links correctly resolve to their corresponding section headings.
3. **Source Code Parity Audit:**
   - Checked all route definitions in `src/routes/auth.routes.js`, `src/routes/board.routes.js`, and `src/routes/task.routes.js`.
   - Checked all Zod schemas in `src/validators/auth.validator.js`, `src/validators/board.validator.js`, and `src/validators/task.validator.js`.
   - Checked controller implementations in `src/controllers/auth.controller.js`, `src/controllers/board.controller.js`, and `src/controllers/task.controller.js`.
   - Confirmed 100% alignment with actual HTTP status codes, payload field names, validation constraints, and error messages.
4. **Automated Test Suite Verification:**
   - Ran `npm test` against the isolated `devflow_test` MongoDB database.
   - Result: 3 test files passed, 52/52 tests passed (0 failed, 0 skipped).
     - `auth.test.js`: 18 passed
     - `board.test.js`: 14 passed
     - `task.test.js`: 20 passed

---

### 6. Remaining Limitations
- **Documentation Scope:** The backend documentation is 100% complete. Frontend application components (Vite + React) have not yet been developed.
- **Test Suite Latency:** Due to MongoDB Atlas cloud network round-trips over TLS, the automated test suite takes ~25–30 seconds to run serially.

---

### 7. Files Modified
- [`backend/README.md`](file:///e:/GitHub-Repo/DevFlow/backend/README.md) — Standardized all 16 endpoints with strict 6-column tables and discrete error blocks; verified 57 JSON blocks.
- [`backend/WORK_REPORT.md`](file:///e:/GitHub-Repo/DevFlow/backend/WORK_REPORT.md) — Appended this Task 8.2 detailed completion report.


---


---

## Micro Task 3.2: Backend Username Validation

### 1. Existing Validation Behavior Discovered
Prior to Micro Task 3.2, user registration requests were inspected across the following components:
- **`backend/src/validators/auth.validator.js` (`registerSchema`):**
  - Username had `.trim()`, `.min(3, "Username must be at least 3 characters long")`, `.max(30, "Username cannot exceed 30 characters")`, and `.toLowerCase()`.
  - Critically, it lacked character-set restriction validation. As a result, characters outside alphanumeric/underscore—including hyphens (`dev-flow`), dots (`dev.flow`), spaces (`dev flow`), special symbols (`user@123`, `user!`), and emojis (`user😊`)—were accepted by the Zod schema. Furthermore, strings with leading/trailing spaces (e.g. `" dev_flow"`) were silently trimmed rather than rejected.
- **`backend/src/models/user.model.js` (`userSchema`):**
  - Username field configured with `minlength: 3`, `maxlength: 30`, `trim: true`, `lowercase: true`, and `unique: true`.
  - No Mongoose `match` regular expression existed on `username`.
- **`backend/src/middlewares/validate.middleware.js`:**
  - Standard Express validation middleware that parses `req.body` with Zod and forwards issues as `ApiError(400, "Validation Error", errors)`.

### 2. Validation Rule Implemented
In `backend/src/validators/auth.validator.js`, updated `registerSchema` to enforce the requested regular expression:
```javascript
export const registerSchema = z.object({
    username: z
        .string({ required_error: "Username is required" })
        .min(3, "Username must be at least 3 characters long")
        .max(30, "Username cannot exceed 30 characters")
        .regex(
            /^[A-Za-z0-9_]+$/,
            "Username can only contain English letters, numbers, and underscores"
        )
        .toLowerCase(),
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email("Please provide a valid email address")
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(6, "Password must be at least 6 characters long")
});
```
Key architectural details:
- **Allowed Character Set:** Only English uppercase letters (`A-Z`), English lowercase letters (`a-z`), numbers (`0-9`), and underscores (`_`) via `^[A-Za-z0-9_]+$`.
- **Strict Space Rejection:** Removed leading `.trim()` so that usernames with any spaces (leading, middle, or trailing) are rejected by the regular expression rather than silently mutated.
- **Length Constraint Preservation:** Preserved existing `min(3)` and `max(30)` length constraints without modification.
- **Normalization:** Applied `.toLowerCase()` post-regex to preserve case-insensitive uniqueness and consistency with MongoDB and existing auth flows.
- **Error Formatting:** Uses existing `ApiError(400, "Validation Error", ["Username can only contain English letters, numbers, and underscores"])` directly compatible with frontend error parsing.

### 3. Files Modified
- [`backend/src/validators/auth.validator.js`](file:///e:/GitHub-Repo/DevFlow/backend/src/validators/auth.validator.js) — Added regular expression check `/^[A-Za-z0-9_]+$/` and removed silent space trimming.
- [`backend/tests/auth.test.js`](file:///e:/GitHub-Repo/DevFlow/backend/tests/auth.test.js) — Added automated test coverage for invalid character rejections, length boundary checks, and valid username registrations.
- [`backend/WORK_REPORT.md`](file:///e:/GitHub-Repo/DevFlow/backend/WORK_REPORT.md) — Appended this Micro Task 3.2 completion report.

### 4. Validation Cases Tested
1. **Valid Alphanumeric Username:** `"Priyosi123"` — Accepted (parsed to `"priyosi123"`).
2. **Valid Username Containing Underscores:** `"dev_flow"` — Accepted (parsed to `"dev_flow"`).
3. **Valid Mixed Case and Numbers:** `"User_2026"` — Accepted (parsed to `"user_2026"`).
4. **Valid Minimum Length Boundary (3 chars):** `"abc"` and `"123"` — Accepted.
5. **Valid Maximum Length Boundary (30 chars):** `"a".repeat(30)` — Accepted.
6. **Username Containing Spaces:** `"dev flow"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
7. **Username Containing Leading Space:** `" dev_flow"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
8. **Username Containing Trailing Space:** `"dev_flow "` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
9. **Username Containing Hyphens:** `"dev-flow"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
10. **Username Containing Dots:** `"dev.flow"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
11. **Username Containing Special Characters:** `"user@123"` and `"user!"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
12. **Username Containing Emojis:** `"user😊"` — Rejected with 400 (`"Username can only contain English letters, numbers, and underscores"`).
13. **Empty Username:** `""` — Rejected with 400 (`"Username must be at least 3 characters long"`).
14. **Username Below Minimum Length:** `"ab"` (2 chars) — Rejected with 400 (`"Username must be at least 3 characters long"`).
15. **Username Exceeding Maximum Length:** `"a".repeat(31)` (31 chars) — Rejected with 400 (`"Username cannot exceed 30 characters"`).

### 5. Actual Lint and Test Results
- **Syntax Check:** `node -c src/validators/auth.validator.js tests/auth.test.js` passed without errors.
- **Middleware Integration Test:** All 17 unit test cases passed with 0 failures.
- **Full Automated Test Suite (`npm test`):**
  - Test runner: Vitest v5.0.5
  - Test files: 3 passed (3 total)
  - Total tests: 55 passed (55 total, 0 failed, 0 skipped)
    - `tests/auth.test.js`: 21 passed (includes 7 registration test scenarios verifying all username rules and database persistence)
    - `tests/board.test.js`: 14 passed
    - `tests/task.test.js`: 20 passed
  - Execution duration: ~28 seconds

### 6. API-Level Registration Testing Performed
- **Yes.** API-level testing was executed via Supertest against the full Express `app` mounting `/api/v1/auth/register`:
  - Verified HTTP `400 Bad Request` responses on invalid usernames with `{ success: false, message: "Validation Error", errors: [...] }`.
  - Verified HTTP `201 Created` responses on valid usernames with set cookies (`accessToken`, `refreshToken`), response payload, and database persistence in MongoDB Atlas (`devflow_test`).

### 7. Known Limitations
- Network latency: Full automated test runs against remote MongoDB Atlas cluster take ~25–30 seconds.


---

## Task 9: Dynamic Board Columns & Independent Task Completion

### 1. Initial State & Requirements Overview
Prior to Task 9:
- Boards were bound to an immutable set of 3 default columns (`todo`, `in-progress`, `done`).
- The `Task` schema enforced a strict Mongoose enum on `columnKey: ["todo", "in-progress", "done"]`, preventing any custom column identifiers.
- Task completion was inferred solely from column membership (`columnKey === "done"`). Moving a task out of "done" would mark it incomplete, and moving any task to "done" would treat it as completed without an independent flag.
- There were no APIs for creating or renaming columns.

Task 9 Objectives:
1. Support dynamic board columns (minimum 3 default columns, maximum 5 columns per board).
2. Implement Add Column API (`POST /api/v1/boards/:boardId/columns`).
3. Implement Rename Column API (`PATCH /api/v1/boards/:boardId/columns/:columnKey`).
4. Implement independent task completion flag (`isCompleted: Boolean, default: false`) decoupled from column placement.
5. Update Task movement (`PATCH /api/v1/boards/:boardId/tasks/:taskId/move`) to validate against dynamic board columns and preserve `isCompleted`.
6. Maintain 100% backward compatibility for existing boards, tasks, and frontend components.

---

### 2. Files Inspected & Modified
- **`backend/src/models/board.model.js`**
  - Updated `columnSchema` to support both `name` and backward-compatible `title`, unique `key`, and numeric `order`.
  - Added pre-validate and post-init hooks to normalize missing `name` or `title` fields.
  - Standardized `DEFAULT_COLUMNS` to `{ name: "To Do", title: "To Do", key: "todo", order: 0 }`, `{ name: "In Progress", title: "In Progress", key: "in-progress", order: 1 }`, `{ name: "Done", title: "Done", key: "done", order: 2 }`.
- **`backend/src/models/task.model.js`**
  - Removed static Mongoose enum constraint from `columnKey`, allowing dynamic column keys per board.
  - Added `isCompleted: { type: Boolean, default: false }`.
  - Preserved `TASK_COLUMNS` and compound indexes.
- **`backend/src/validators/board.validator.js`**
  - Added `addColumnSchema` validating `{ name }` (trimmed string, 1 to 50 characters, `.strict()`).
  - Added `renameColumnSchema` validating `{ name }` (trimmed string, 1 to 50 characters, `.strict()`).
  - Added `columnKeyParamSchema` validating `:boardId` (valid ObjectId) and `:columnKey` (non-empty string).
- **`backend/src/validators/task.validator.js`**
  - In `createTaskSchema`: changed `columnKey` to optional non-empty string; added optional `isCompleted: z.boolean()`.
  - In `updateTaskSchema`: added optional `isCompleted: z.boolean()`; updated `.refine()` to allow `isCompleted` updates.
  - In `moveTaskSchema`: updated `columnKey` to require a non-empty string.
- **`backend/src/services/board.service.js`**
  - Added `generateColumnKey(name, existingColumns)` generating URL/slug-friendly stable keys (e.g., `in-review`, `in-review-1`).
  - Added `addColumn(boardId, { name }, userId)` with atomic concurrency guard `"columns.4": { $exists: false }` to strictly cap columns at 5.
  - Added `renameColumn(boardId, columnKey, { name }, userId)` updating column `name` and `title` without mutating `key`, `order`, or tasks.
- **`backend/src/controllers/board.controller.js`**
  - Added `addColumn` controller returning `ApiResponse(201, updatedBoard, "Column added successfully")`.
  - Added `renameColumn` controller returning `ApiResponse(200, updatedBoard, "Column renamed successfully")`.
- **`backend/src/routes/board.routes.js`**
  - Mounted `POST /:boardId/columns` with `validateParams(boardIdParamSchema)`, `validate(addColumnSchema)`, and `addColumn`.
  - Mounted `PATCH /:boardId/columns/:columnKey` with `validateParams(columnKeyParamSchema)`, `validate(renameColumnSchema)`, and `renameColumn`.
- **`backend/src/services/task.service.js`**
  - Added `getValidColumnKeys(board)` dynamically extracting valid keys from `board.columns`.
  - Updated `createTask` to validate target column key against board's columns and initialize `isCompleted`.
  - Updated `getBoardTasks` to validate `columnKey` query filter against board's columns.
  - Updated `updateTask` to support updating `isCompleted` independently.
  - Updated `moveTask` to validate `targetColumnKey` against board's columns, maintain sequential ordering, and preserve `isCompleted` without modification.
- **`backend/tests/board.test.js`**
  - Added test suite for `POST /api/v1/boards/:boardId/columns` (sequential order, max 5 limit, reject 6th, empty name, 404 unauthorized).
  - Added test suite for `PATCH /api/v1/boards/:boardId/columns/:columnKey` (renaming, key/order preservation, empty name, nonexistent key, 404 unauthorized).
- **`backend/tests/task.test.js`**
  - Added tests for `isCompleted: false` default on task creation.
  - Added tests for toggling `isCompleted: true` and `isCompleted: false` without altering column or order.
  - Added tests for preserving `isCompleted: true` across column moves.
  - Added tests ensuring moving to "done" column does not automatically mark a task completed.
  - Added tests for moving tasks into dynamically added columns.
- **`backend/README.md`**
  - Added documentation for endpoints 9.6 (`POST /api/v1/boards/:boardId/columns`) and 9.7 (`PATCH /api/v1/boards/:boardId/columns/:columnKey`).
  - Updated `Task` creation and update schemas to document `isCompleted`.

---

### 3. Schema & API Design

#### A. Board Columns Schema
```javascript
columns: [
  {
    name: "To Do",
    title: "To Do",
    key: "todo",
    order: 0
  },
  {
    name: "In Progress",
    title: "In Progress",
    key: "in-progress",
    order: 1
  },
  {
    name: "Done",
    title: "Done",
    key: "done",
    order: 2
  }
]
```

#### B. New Endpoints
1. **`POST /api/v1/boards/:boardId/columns`**
   - **Auth:** `verifyJWT`
   - **Body:** `{ "name": "In Review" }`
   - **Response (201 Created):** Returns the full updated Board document with the appended column:
     ```json
     {
       "statusCode": 201,
       "data": {
         "_id": "671bb200e4b0234567890456",
         "title": "Project Alpha",
         "columns": [
           { "name": "To Do", "title": "To Do", "key": "todo", "order": 0 },
           { "name": "In Progress", "title": "In Progress", "key": "in-progress", "order": 1 },
           { "name": "Done", "title": "Done", "key": "done", "order": 2 },
           { "name": "In Review", "title": "In Review", "key": "in-review", "order": 3 }
         ]
       },
       "message": "Column added successfully",
       "success": true
     }
     ```
   - **Error (400 Bad Request):** If board already has 5 columns: `"Board cannot have more than 5 columns"`.

2. **`PATCH /api/v1/boards/:boardId/columns/:columnKey`**
   - **Auth:** `verifyJWT`
   - **Body:** `{ "name": "Backlog" }`
   - **Response (200 OK):** Returns the full updated Board document with the column renamed. Key and order remain unchanged.
   - **Error (404 Not Found):** If column does not exist on the board: `"Column not found"`.

#### C. Independent Task Completion Field
- **Task Schema Field:** `isCompleted: { type: Boolean, default: false }`.
- **Creation:** Optional `isCompleted` field in `POST /api/v1/boards/:boardId/tasks`, defaults to `false`.
- **Updating:** `PATCH /api/v1/boards/:boardId/tasks/:taskId` accepts `{ "isCompleted": true }` or `{ "isCompleted": false }`.
- **Movement:** `PATCH /api/v1/boards/:boardId/tasks/:taskId/move` updates only `columnKey` and `order`; `isCompleted` is completely untouched. Moving into or out of "done" does not alter `isCompleted`.

---

### 4. Migration & Backward Compatibility Strategy
- **Dual Naming on Columns:** To avoid breaking frontend components (`KanbanColumn.jsx` and `columnSorting.js` check `typeof col.title === "string"`), both `name` and `title` are stored and kept synchronized.
- **Default Columns Guarantee:** Any board document queried that lacks a `columns` array or has an empty array automatically receives the 3 default columns (`To Do`, `In Progress`, `Done`) via Mongoose defaults and `post("init")` hook.
- **Task Completion Historical Data:** In accordance with the project specification, existing tasks without an explicit `isCompleted` field default to `isCompleted: false`. Completed status is not inferred solely from `columnKey === "done"` to avoid silently changing user data.
- **Dynamic Task Movement:** Any task moving to a valid column key present on the board is accepted, while moves to deleted or non-existent columns are rejected with HTTP 400.

---

### 5. Automated Test Suite Results
Executed `npm test` against the live MongoDB Atlas test database (`devflow_test`):
- **Test Runner:** Vitest v5.0.5 + Supertest v7.3.1
- **Total Test Files:** 3 passed (3 total)
  - [`backend/tests/board.test.js`](file:///e:/GitHub-Repo/DevFlow/backend/tests/board.test.js): 25 passed (added 11 column tests: add, max 5, reject 6th, rename, key/order preservation, unauthorized)
  - [`backend/tests/task.test.js`](file:///e:/GitHub-Repo/DevFlow/backend/tests/task.test.js): 25 passed (added 5 completion & dynamic column tests)
  - [`backend/tests/auth.test.js`](file:///e:/GitHub-Repo/DevFlow/backend/tests/auth.test.js): 21 passed
- **Total Tests:** **71 passed (71 total, 0 failed, 0 skipped)**
- **Duration:** ~38.5 seconds

---

### 6. Remaining Work & Frontend Contract Changes for Task 10
When implementing the frontend in Task 10, the following API contracts are ready:
1. **Adding Columns:** `POST /api/v1/boards/:boardId/columns` with payload `{ "name": "Column Name" }`.
2. **Renaming Columns:** `PATCH /api/v1/boards/:boardId/columns/:columnKey` with payload `{ "name": "New Name" }`.
3. **Column Keys:** Stable slug format (e.g. `in-review`). UI should use `column.key` for task grouping and drag-and-drop droppable container IDs.
4. **Task Completion:** `PATCH /api/v1/boards/:boardId/tasks/:taskId` with payload `{ "isCompleted": true | false }`. The completion checkbox/button should call this endpoint directly without moving the task across columns.

---

## Task 9A: Backend Verification: Migration Safety, Column Concurrency & Final Checks

### 1. Objective & Scope
Perform a focused verification and hardening pass over the Task 9 backend implementation prior to frontend Task 10:
1. **Migration Safety Verification:**
   - Verify whether legacy boards (missing `columns` or `columns: []`) are properly persisted with the default 3 columns into MongoDB upon retrieval or modification.
   - Ensure existing boards with custom columns remain completely untouched.
   - Avoid unintentional mutation or data loss.
2. **Column Concurrency & Cap Enforcement:**
   - Verify concurrent `addColumn()` requests against race conditions (duplicate orders, duplicate keys, exceeding 5 columns).
   - Implement an atomic driver-level length guard and retry mechanism.
3. **Column Key (Slug) Generation Verification:**
   - Verify slug generation handles empty names, whitespace, special characters, and collisions with incrementing suffixes (`-1`, `-2`).
4. **Independent Task Completion Verification:**
   - Verify `isCompleted` defaults to `false`, toggles cleanly without affecting column or order, and is completely decoupled from `"done"` column status.
5. **Automated Test Suite Expansion & Execution:**
   - Expand `backend/tests/board.test.js` and `backend/tests/task.test.js` with comprehensive integration tests covering legacy migration, concurrent column operations, and boundary caps.
   - Execute the full test suite against live MongoDB Atlas (`devflow_test`).

---

### 2. Verification Findings & Hardening Applied

#### A. Legacy Board Migration Safety
- **Observation:** In the initial Task 9 implementation, Mongoose schema defaults and the `post("init")` hook populated default columns in-memory when a document missing `columns` or with `columns: []` was loaded. However, purely read-based operations (`getUserBoards`, `getBoardById`) did not persist these columns back to MongoDB Atlas unless an explicit write occurred.
- **Hardening Applied:**
  - Implemented `ensureBoardColumnsPersisted(board)` in `backend/src/services/board.service.js`.
  - Checks `if (board.isModified("columns")) await board.save();` so that any legacy document initialized with default columns is idempotently persisted to MongoDB Atlas on read.
  - Integrated `ensureBoardColumnsPersisted` into:
    - `boardService.getUserBoards(userId)`
    - `boardService.getBoardById(boardId, userId)`
    - `boardService.addColumn(boardId, { name }, userId)`
    - `boardService.renameColumn(boardId, columnKey, { name }, userId)`
    - `taskService.verifyBoardOwnership(boardId, userId)` (ensures task CRUD/movement on a legacy board also guarantees column persistence).
  - Documents with already-existing custom columns have `isModified("columns") === false`, avoiding redundant write overhead and preserving custom column configurations.

#### B. Column Concurrency & 5-Column Cap
- **Observation:** Under concurrent execution, two simultaneous `addColumn()` requests reading the board document at the same initial state (e.g. 3 columns) both calculated `order: 3` and generated identical slug keys, with only the `"columns.4": { $exists: false }` filter guarding the 5-column upper bound.
- **Hardening Applied:**
  - Enhanced `boardService.addColumn` with an atomic optimistic-locking condition:
    ```javascript
    const updatedBoard = await Board.findOneAndUpdate(
        {
            _id: boardId,
            owner: userId,
            columns: { $size: currentColumns.length },
            "columns.4": { $exists: false }
        },
        {
            $push: { columns: newColumn }
        },
        { returnDocument: "after", runValidators: true }
    );
    ```
  - Added an automatic retry loop (up to 3 attempts): If another concurrent request updates the array first, the array length changes, causing `columns: { $size: currentColumns.length }` to safely evaluate to `null`. The loop re-fetches the latest document state, verifies if the 5-column cap is reached (returning 400 if so), re-computes the next sequential order and non-colliding slug (e.g., `col-1`), and successfully persists the column.

#### C. Column Key (Slug) Generation
- Verified `generateColumnKey(name, existingColumns)` across diverse inputs:
  - `"In Review"` → `"in-review"`
  - `"  QA & Testing!  "` → `"qa-testing"`
  - `"***"` (special characters only) → `"col"`
  - Consecutive additions with identical names → `"qa"`, `"qa-1"`, `"qa-2"`.

#### D. Independent Task Completion
- Verified that `isCompleted`:
  - Defaults to `false` for new tasks.
  - Can be updated via `PATCH /api/v1/boards/:boardId/tasks/:taskId` with `{ "isCompleted": true }` or `{ "isCompleted": false }` without changing column or order.
  - Is strictly preserved when moving a task between columns via `PATCH /api/v1/boards/:boardId/tasks/:taskId/move`.
  - Is not automatically set to `true` when moving to `"done"`, nor cleared when moving out of `"done"`.

---

### 3. Automated Test Suite Results
Executed the Vitest test suite against live MongoDB Atlas test database (`devflow_test`):
- **Test Runner:** Vitest v5.0.5 + Supertest v7.3.1
- **Command:** `npm test`
- **Total Test Files:** 3 passed (3 total)
  - `backend/tests/board.test.js`: **31 passed** (added 3 legacy migration tests + 3 concurrent addition tests)
  - `backend/tests/task.test.js`: **26 passed** (added 1 legacy board task persistence test)
  - `backend/tests/auth.test.js`: **21 passed**
- **Total Tests Passed:** **78 passed (78 total, 0 failed, 0 skipped)**
- **Duration:** 51.79 seconds

#### New Test Cases Added:
1. `should migrate and persist default columns for legacy boards missing columns field` (verified raw document in MongoDB collection now contains 3 default columns).
2. `should migrate and persist default columns for legacy boards with empty columns array` (verified raw document now contains 3 default columns).
3. `should not modify or overwrite boards that already have custom columns` (verified custom columns are preserved).
4. `should handle concurrent column additions with distinct names without order collision` (verified sequential orders 0, 1, 2, 3, 4 without duplicates).
5. `should handle concurrent column additions with identical names without key collision` (verified unique slug suffixes e.g. `review` and `review-1`).
6. `should enforce 5-column cap under concurrent additions at column limit boundary` (verified 1 succeeded with 201, 1 rejected with 400, final count exactly 5).
7. `should trigger column persistence when creating a task on a legacy board missing columns` (verified task creation initiates board column persistence).

---

### 4. Readiness for Frontend Task 10
The backend is confirmed stable, race-condition safe, fully backward compatible, and ready for Frontend Task 10.
