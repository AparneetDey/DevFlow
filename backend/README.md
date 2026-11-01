# DevFlow Backend API Documentation

Welcome to the backend API documentation for **DevFlow**, a Trello-inspired Kanban task management application.

DevFlow provides a structured, production-grade RESTful API for user authentication, board organization, and Kanban card workflow management. It is designed around a clean layered architecture with centralized error handling, robust request validation, dual-token JWT authentication with HttpOnly cookies, and strict cross-user data isolation.

---

## Table of Contents

1. [Project Overview and Tech Stack](#1-project-overview-and-tech-stack)
2. [Getting Started and Installation](#2-getting-started-and-installation)
3. [Environment Configuration](#3-environment-configuration)
4. [Architecture and Design Principles](#4-architecture-and-design-principles)
5. [Authentication and Security Mechanism](#5-authentication-and-security-mechanism)
6. [Standard API Response Format](#6-standard-api-response-format)
7. [Complete API Summary Table](#7-complete-api-summary-table)
8. [Authentication API Group](#8-authentication-api-group)
   - [8.1 Register User (`POST /api/v1/auth/register`)](#81-register-user)
   - [8.2 Login User (`POST /api/v1/auth/login`)](#82-login-user)
   - [8.3 Refresh Access Token (`POST /api/v1/auth/refresh-token`)](#83-refresh-access-token)
   - [8.4 Logout User (`DELETE /api/v1/auth/logout`)](#84-logout-user)
   - [8.5 Get Current User (`GET /api/v1/auth/me`)](#85-get-current-user)
9. [Board Management API Group](#9-board-management-api-group)
   - [9.1 Create Board (`POST /api/v1/boards`)](#91-create-board)
   - [9.2 List User Boards (`GET /api/v1/boards`)](#92-list-user-boards)
   - [9.3 Get Board by ID (`GET /api/v1/boards/:boardId`)](#93-get-board-by-id)
   - [9.4 Update Board (`PATCH /api/v1/boards/:boardId`)](#94-update-board)
   - [9.5 Delete Board (`DELETE /api/v1/boards/:boardId`)](#95-delete-board)
   - [9.6 Add Column (`POST /api/v1/boards/:boardId/columns`)](#96-add-column)
   - [9.7 Rename Column (`PATCH /api/v1/boards/:boardId/columns/:columnKey`)](#97-rename-column)
   - [9.8 Reorder Columns (`PATCH /api/v1/boards/:boardId/columns/reorder`)](#98-reorder-columns)
   - [9.9 Delete Column (`DELETE /api/v1/boards/:boardId/columns/:columnKey`)](#99-delete-column)
10. [Task and Card Management API Group](#10-task-and-card-management-api-group)
    - [10.1 Create Task (`POST /api/v1/boards/:boardId/tasks`)](#101-create-task)
    - [10.2 List Tasks for a Board (`GET /api/v1/boards/:boardId/tasks`)](#102-list-tasks-for-a-board)
    - [10.3 Get Task by ID (`GET /api/v1/boards/:boardId/tasks/:taskId`)](#103-get-task-by-id)
    - [10.4 Update Task Details (`PATCH /api/v1/boards/:boardId/tasks/:taskId`)](#104-update-task-details)
    - [10.5 Move or Reorder Task (`PATCH /api/v1/boards/:boardId/tasks/:taskId/move`)](#105-move-or-reorder-task)
    - [10.6 Delete Task (`DELETE /api/v1/boards/:boardId/tasks/:taskId`)](#106-delete-task)
11. [Frontend Integration Guide](#11-frontend-integration-guide)
12. [End-to-End Workflow Walkthrough](#12-end-to-end-workflow-walkthrough)
13. [Automated Testing Suite](#13-automated-testing-suite)

---

## 1. Project Overview and Tech Stack

- **Application Name:** DevFlow
- **Technology Stack:**
  - **Runtime:** Node.js (ES Modules, `"type": "module"`)
  - **Web Framework:** Express.js (v5.x)
  - **Database & ODM:** MongoDB with Mongoose ODM (v9.x)
  - **Input Validation:** Zod (v4.x)
  - **Authentication:** JSON Web Tokens (`jsonwebtoken`) & `bcrypt` password hashing
  - **Cookie Parsing:** `cookie-parser`
  - **Testing Framework:** Vitest (v5.x) & Supertest (v7.x)
- **API Version:** `v1`
- **Base URL:** `http://localhost:<PORT>/api/v1`
  - **Default Local Endpoint:** `http://localhost:8000/api/v1` *(where `<PORT>` is set in `.env` or defaults to `8000`)*
- **Data Interchange Format:** `application/json`

---

## 2. Getting Started and Installation

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)
- A running MongoDB instance (local MongoDB server or MongoDB Atlas cluster connection string)

### Step-by-Step Setup

1. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory by copying the provided template:
   ```bash
   cp .env.example .env
   ```
   Open `backend/.env` and configure your MongoDB connection string and secret keys.

4. **Start the Development Server:**
   Runs the server with `nodemon` for automatic reloading upon code changes:
   ```bash
   npm run dev
   ```
   *Console output on successful connection:*
   ```text
   [DATABASE] MongoDB Connected Successfully :: Connected Host :: cluster0.example.mongodb.net
   [SERVER] Server Successfully Running :: Port 8000
   ```

5. **Start for Production:**
   ```bash
   npm start
   ```

6. **Run Automated Tests:**
   Executes all 52 automated tests against the dedicated test database:
   ```bash
   npm test
   ```

---

## 3. Environment Configuration

The backend loads configuration from `backend/.env` using `dotenv`. The table below details all supported environment variables:

| Variable | Required | Purpose | Example / Default |
|:---|:---:|:---|:---|
| `PORT` | No | Port on which the Express HTTP server listens. | `8000` *(defaults to `8000` if omitted)* |
| `MONGO_DB_URI` | **Yes** | MongoDB connection string (Atlas cluster or local URI). | `mongodb+srv://<user>:<password>@cluster0.example.mongodb.net` |
| `DEV_URL` | No | Frontend client origin permitted by CORS policy. | `http://localhost:5173` *(Vite default)* |
| `ACCESS_TOKEN_SECRET` | **Yes** | Cryptographic symmetric key used to sign and verify access tokens. | `<strong_random_secret_string>` |
| `ACCESS_TOKEN_EXPIRY` | No | Validity duration of access tokens. | `1d` *(defaults to `1d`)* |
| `REFRESH_TOKEN_SECRET` | **Yes** | Cryptographic symmetric key used to sign and verify refresh tokens. | `<strong_random_secret_string>` |
| `REFRESH_TOKEN_EXPIRY` | No | Validity duration of refresh tokens. | `10d` *(defaults to `10d`)* |
| `NODE_ENV` | No | Runtime mode (`development`, `production`, `test`). In production, cookies enforce `secure: true` and `sameSite: "none"`, while error stack traces are suppressed. | `development` |
| `TEST_DB_NAME` | No | Isolated database name used exclusively for test suites. Safety guards prevent running tests against `devflow` or `production`. | `devflow_test` |

> **Security Warning:** Never commit `.env` files containing actual passwords or secret keys to version control. Always maintain `.env.example` as a safe placeholder template.

---

## 4. Architecture and Design Principles

DevFlow strictly adheres to a layered architecture ensuring decoupling, testability, and clear separation of concerns:

$$\text{Routes} \longrightarrow \text{Middleware} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Models} \longrightarrow \text{MongoDB}$$

1. **Routes (`src/routes/`):** Define URL endpoints, HTTP methods, and mount middlewares in order. Route parameters are validated before reaching controllers.
2. **Middleware (`src/middlewares/`):**
   - [`verifyJWT`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/auth.middleware.js): Validates JWT access tokens from cookies or Authorization Bearer header and attaches the user document to `req.user`.
   - [`validate`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/validate.middleware.js): Validates and sanitizes request bodies against strict Zod schemas; rejects unexpected properties.
   - [`validateParams`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/validate.middleware.js): Validates route parameters (e.g., verifying MongoDB ObjectIds).
   - [`notFoundHandler`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/notFound.middleware.js): Intercepts requests to unmatched routes and forwards a standardized 404 `ApiError`.
   - [`errorHandler`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/error.middleware.js): Centralized error middleware formatting operational and unexpected errors into a uniform JSON response.
3. **Controllers (`src/controllers/`):** Parse HTTP inputs, invoke business services, set HttpOnly response cookies, and construct responses via `ApiResponse`. Wrapped in `asyncHandler` to eliminate repetitive `try-catch` blocks.
4. **Services (`src/services/`):** Encapsulate all business rules, cross-user ownership verification, token hashing/rotation, column order normalizations, and database queries. Throws `ApiError` instances on rule violations.
5. **Models (`src/models/`):** Mongoose schemas enforcing database-level validation, compound indexing, bcrypt password hashing hooks, and deterministic SHA-256 token hashing.

---

## 5. Authentication and Security Mechanism

DevFlow features a modern dual-token authentication system supporting both browser-based HttpOnly cookies and native API Bearer tokens.

### 1. Dual-Token Architecture
- **Access Token:** Short-lived JWT (default 1 day). Contains user identification claims: `{ _id, email, username }`. Required to authorize all protected endpoints.
- **Refresh Token:** Long-lived JWT (default 10 days). Contains `{ _id, jti }`. Used solely at `POST /api/v1/auth/refresh-token` to obtain a fresh token pair.
- **SHA-256 Token Storage:** Raw refresh tokens are **never stored** in MongoDB. The backend stores a deterministic SHA-256 hash (`User.hashRefreshToken(rawToken)`). During rotation, incoming candidate tokens are hashed and validated in constant time using `crypto.timingSafeEqual` to eliminate timing attack vectors.

### 2. Supported Client Transport Modes
The API seamlessly supports both web browser clients and programmatic API clients:
- **HttpOnly Cookies:** Automatically set in response headers on `register`, `login`, and `refresh-token`:
  - `httpOnly: true` (inaccessible to JavaScript, defending against XSS)
  - `secure: true` in production (`false` in local development)
  - `sameSite: "none"` in production (`"lax"` in development)
  - `path: "/"`
  - `maxAge`: 24 hours for `accessToken`, 10 days for `refreshToken`
- **Authorization Header:** Clients may send the access token explicitly:
  ```http
  Authorization: Bearer <accessToken>
  ```
  If both an HttpOnly cookie and an Authorization header are present, the Authorization header takes precedence.

### 3. Refresh Token Rotation & Replay Protection
- Refreshing tokens rotates **both** the access token and the refresh token.
- When `POST /api/v1/auth/refresh-token` executes:
  1. The incoming refresh token is verified for valid JWT signature and expiration.
  2. The candidate token's hash is compared with the stored hash in the user record.
  3. A new access token and new refresh token are generated.
  4. An atomic update (`findOneAndUpdate({ _id, refreshToken: currentHash }, { refreshToken: newHash })`) updates the hash.
- **Replay Protection:** If an old or intercepted refresh token is presented again, the stored hash will not match, causing an immediate `401 Unauthorized` rejection.

### 4. Logout Invalidation
- Invoking `DELETE /api/v1/auth/logout` atomically unsets the stored refresh token hash (`$unset: { refreshToken: 1 }`).
- Both `accessToken` and `refreshToken` cookies are cleared with expiration dates in the past.
- Once cleared, the refresh token cannot be used again. Existing access tokens expire naturally upon reaching their token lifetime.

---

## 6. Standard API Response Format

All responses follow a predictable JSON contract.

### Success Response Format
Constructed by the [`ApiResponse`](file:///e:/GitHub-Repo/DevFlow/backend/src/utils/ApiResponse.js) class:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Operation completed successfully",
  "success": true
}
```

- `statusCode` *(number)*: HTTP status code matching the HTTP response header (e.g., `200`, `201`).
- `data` *(object | array | null)*: The payload returned by the service.
- `message` *(string)*: Descriptive operational status message.
- `success` *(boolean)*: Always `true` for all status codes $< 400$.

### Error Response Format
Constructed by the centralized [`errorHandler`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/error.middleware.js) middleware:

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Title cannot be empty"
  ]
}
```

- `statusCode` *(number)*: HTTP error status code (e.g., `400`, `401`, `404`, `409`, `500`).
- `success` *(boolean)*: Always `false` for all error responses.
- `message` *(string)*: High-level error summary.
- `errors` *(array of strings)*: Granular validation or operational error details (empty array `[]` when not a validation error).
- `stack` *(string, optional)*: Included only when `NODE_ENV !== "production"` for debugging; automatically stripped in production environments.

---

## 7. Complete API Summary Table

The table below catalogs all **16 endpoints** implemented in DevFlow:

| Method | Endpoint | Authentication | Description |
|:---|:---|:---:|:---|
| **Authentication** | | | |
| `POST` | `/api/v1/auth/register` | None (Public) | Register a new user account with credentials |
| `POST` | `/api/v1/auth/login` | None (Public) | Authenticate user credentials and issue token pair |
| `POST` | `/api/v1/auth/refresh-token` | None / Cookie | Rotate refresh token and issue a fresh token pair |
| `DELETE` | `/api/v1/auth/logout` | `verifyJWT` | Log out user, invalidate refresh token in DB, and clear cookies |
| `GET` | `/api/v1/auth/me` | `verifyJWT` | Fetch currently authenticated user profile |
| **Board Management** | | | |
| `POST` | `/api/v1/boards` | `verifyJWT` | Create a new board with 3 default columns |
| `GET` | `/api/v1/boards` | `verifyJWT` | List all boards owned by the authenticated user |
| `GET` | `/api/v1/boards/:boardId` | `verifyJWT` | Retrieve details of a specific board by ID |
| `PATCH` | `/api/v1/boards/:boardId` | `verifyJWT` | Update board title and/or description |
| `DELETE` | `/api/v1/boards/:boardId` | `verifyJWT` | Delete a board and cascade delete all its tasks |
| `POST` | `/api/v1/boards/:boardId/columns` | `verifyJWT` | Add a new column to a board (up to max 5 columns) |
| `PATCH` | `/api/v1/boards/:boardId/columns/:columnKey` | `verifyJWT` | Rename an existing board column without changing key/order |
| `PATCH` | `/api/v1/boards/:boardId/columns/reorder` | `verifyJWT` | Reorder columns with persistent sequential order values |
| `DELETE` | `/api/v1/boards/:boardId/columns/:columnKey` | `verifyJWT` | Delete a column with task move or cascade task delete |
| **Task Management** | | | |
| `POST` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | Create a new task under a board |
| `GET` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | List tasks on a board (supports optional `?columnKey=` filter) |
| `GET` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Retrieve a single task by ID |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Update task details (title, description, priority, dueDate) |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId/move` | `verifyJWT` | Move task to another column or reposition order index |
| `DELETE` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Delete a task and normalize remaining column task orders |

---

## 8. Authentication API Group

### 8.1 Register User

#### A. Endpoint Information
- **API Name:** Register User
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/auth/register`
- **Authentication Required:** No (Public)
- **Purpose and Functionality:** Creates a new user account in MongoDB, hashes the user's password with bcrypt, creates an initial access token and refresh token, stores a SHA-256 hash of the refresh token, and sets HttpOnly cookies.
- **Business Logic & Side Effects:** Checks for existing duplicate usernames or emails; creates user document in MongoDB; sets `accessToken` and `refreshToken` cookies in response header.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
- **Authentication Headers / Cookies:** None.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `username` | String | Yes | None | Trimmed, lowercase, 3 to 30 characters | Unique user handle |
  | `email` | String | Yes | None | Trimmed, lowercase, valid email format | Unique user email address |
  | `password` | String | Yes | None | Minimum 6 characters | Plaintext password to be bcrypt-hashed |

#### C. Request Payload Example
```json
{
  "username": "alexdeveloper",
  "email": "alex@example.com",
  "password": "SuperSecretPassword123!"
}
```

#### D. Success Response
- **HTTP Status Code:** `201 Created`
- **Response Headers / Cookies Set:**
  - `Set-Cookie: accessToken=<jwt>; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
  - `Set-Cookie: refreshToken=<jwt>; HttpOnly; Path=/; Max-Age=864000; SameSite=Lax`
- **Response Content Description:** Returns the created user profile (omitting password and refreshToken) and both JWT tokens.

```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "_id": "671aa100e4b0234567890123",
      "username": "alexdeveloper",
      "email": "alex@example.com",
      "createdAt": "2026-10-25T10:00:00.000Z",
      "updatedAt": "2026-10-25T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJlbWFpbCI6ImFsZXhAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFsZXhkZXZlbG9wZXIiLCJpYXQiOjE3Mjk4NTI4MDAsImV4cCI6MTcyOTkzOTIwMH0.exampleSignatureOnly",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJqdGkiOiJmMjRkMmE0NS1jYjVjLTQ5NmQtOGFjZi01MjY4ZmMxYzg3ODIiLCJpYXQiOjE3Mjk4NTI4MDAsImV4cCI6MTczMDcxNjgwMH0.exampleSignatureOnly"
  },
  "message": "User registered successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when the request body violates Zod validation rules (short username, invalid email format, short password).
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Username must be at least 3 characters long",
    "Please provide a valid email address",
    "Password must be at least 6 characters long"
  ]
}
```

##### Error: 409 Conflict
Triggered when the username or email is already taken by another account in the database.
```json
{
  "statusCode": 409,
  "success": false,
  "message": "User with this email already exists",
  "errors": []
}
```

---

### 8.2 Login User

#### A. Endpoint Information
- **API Name:** Login User
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/auth/login`
- **Authentication Required:** No (Public)
- **Purpose and Functionality:** Authenticates user credentials using email and password. Generates fresh access and refresh tokens, updates the stored SHA-256 refresh token hash in MongoDB, and issues updated HttpOnly cookies.
- **Business Logic & Side Effects:** Compares password via `bcrypt.compare`; updates `user.refreshToken` in MongoDB; sets HttpOnly cookies.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
- **Authentication Headers / Cookies:** None.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `email` | String | Yes | None | Trimmed, lowercase, valid email | Registered user email |
  | `password` | String | Yes | None | Minimum 1 character | Candidate plaintext password |

#### C. Request Payload Example
```json
{
  "email": "alex@example.com",
  "password": "SuperSecretPassword123!"
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:**
  - `Set-Cookie: accessToken=<jwt>; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
  - `Set-Cookie: refreshToken=<jwt>; HttpOnly; Path=/; Max-Age=864000; SameSite=Lax`
- **Response Content Description:** Returns safe user profile data and newly signed access and refresh tokens.

```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "671aa100e4b0234567890123",
      "username": "alexdeveloper",
      "email": "alex@example.com",
      "createdAt": "2026-10-25T10:00:00.000Z",
      "updatedAt": "2026-10-25T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJlbWFpbCI6ImFsZXhAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFsZXhkZXZlbG9wZXIiLCJpYXQiOjE3Mjk4NTI4MDAsImV4cCI6MTcyOTkzOTIwMH0.exampleSignatureOnly",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJqdGkiOiJmMjRkMmE0NS1jYjVjLTQ5NmQtOGFjZi01MjY4ZmMxYzg3ODIiLCJpYXQiOjE3Mjk4NTI4MDAsImV4cCI6MTczMDcxNjgwMH0.exampleSignatureOnly"
  },
  "message": "User logged in successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when email or password is missing or empty.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Email is required",
    "Password is required"
  ]
}
```

##### Error: 401 Unauthorized
Triggered when the email is not registered or the candidate password fails bcrypt comparison.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Invalid email or password",
  "errors": []
}
```

---

### 8.3 Refresh Access Token

#### A. Endpoint Information
- **API Name:** Refresh Access Token
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/auth/refresh-token`
- **Authentication Required:** No (Authenticates via refresh token candidate)
- **Purpose and Functionality:** Rotates both the access token and refresh token. Validates candidate refresh token against stored SHA-256 hash in MongoDB and performs atomic update.
- **Business Logic & Side Effects:** Replaces old refresh token hash in MongoDB with a new hash, invalidating the old refresh token; sets updated HttpOnly cookies.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | No* | `application/json` | Required if delivering token via JSON body |
- **Authentication Headers / Cookies:** Accepts `Cookie: refreshToken=<token>` OR JSON request body `{ "refreshToken": "<token>" }`.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** Optional if cookie is provided; required if cookie is omitted.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `refreshToken` | String | Optional* | None | Valid signed JWT string | Candidate refresh token |

#### C. Request Payload Example
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJqdGkiOiJmMjRkMmE0NS1jYjVjLTQ5NmQtOGFjZi01MjY4ZmMxYzg3ODIiLCJpYXQiOjE3Mjk4NTI4MDAsImV4cCI6MTczMDcxNjgwMH0.exampleSignatureOnly"
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:**
  - `Set-Cookie: accessToken=<newJwt>; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
  - `Set-Cookie: refreshToken=<newJwt>; HttpOnly; Path=/; Max-Age=864000; SameSite=Lax`
- **Response Content Description:** Returns the newly rotated access token and refresh token strings.

```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJlbWFpbCI6ImFsZXhAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6ImFsZXhkZXZlbG9wZXIiLCJpYXQiOjE3Mjk4NTM2MDAsImV4cCI6MTcyOTk0MDAwMH0.exampleSignatureOnly",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzFhYTEwMGU0YjAyMzQ1Njc4OTAxMjMiLCJqdGkiOiJkM2VhMmM0NS1kZjVjLTQ5NmQtOGFjZi05ODc2ZmMxYzg5OTEiLCJpYXQiOjE3Mjk4NTM2MDAsImV4cCI6MTczMDcxNzYwMH0.exampleSignatureOnly"
  },
  "message": "Access token refreshed successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when no refresh token is provided in either the request body or cookies.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Refresh token is required"
  ]
}
```

##### Error: 401 Unauthorized
Triggered when the refresh token is expired, has an invalid signature, has already been rotated (replay attack), or user does not exist.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Refresh token is invalid or has already been used",
  "errors": []
}
```

---

### 8.4 Logout User

#### A. Endpoint Information
- **API Name:** Logout User
- **HTTP Method:** `DELETE`
- **Complete Endpoint URL:** `/api/v1/auth/logout`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Clears user session. Unsets the stored refresh token hash in MongoDB (`$unset: { refreshToken: 1 }`), preventing future token rotations, and clears `accessToken` and `refreshToken` cookies.
- **Business Logic & Side Effects:** Removes stored refresh token hash in database; clears HttpOnly cookies on client.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
DELETE /api/v1/auth/logout HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:**
  - `Set-Cookie: accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  - `Set-Cookie: refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Response Content Description:** Returns logout confirmation message.

```json
{
  "statusCode": 200,
  "data": {
    "message": "Logged out successfully"
  },
  "message": "User logged out successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 401 Unauthorized
Triggered when no access token is provided or the token has expired.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Authorization header missing",
  "errors": []
}
```

---

### 8.5 Get Current User

#### A. Endpoint Information
- **API Name:** Get Current User
- **HTTP Method:** `GET`
- **Complete Endpoint URL:** `/api/v1/auth/me`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Fetches the profile of the currently authenticated user based on the decoded access token.
- **Business Logic & Side Effects:** Excludes `password` and `refreshToken` fields from the returned user document.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
GET /api/v1/auth/me HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns safe user profile data.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671aa100e4b0234567890123",
    "username": "alexdeveloper",
    "email": "alex@example.com",
    "createdAt": "2026-10-25T10:00:00.000Z",
    "updatedAt": "2026-10-25T10:00:00.000Z"
  },
  "message": "Current user fetched successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 401 Unauthorized
Triggered when the access token is invalid, expired, or missing.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Access token has expired",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered if the user account referenced in the token has been deleted from MongoDB.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "User not found",
  "errors": []
}
```

---

## 9. Board Management API Group

All board endpoints require authentication via `verifyJWT`. Data isolation guarantees that users can only access boards they own.

### 9.1 Create Board

#### A. Endpoint Information
- **API Name:** Create Board
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/boards`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Creates a new board associated with the authenticated user. Automatically attaches three default columns (`Todo`, `In Progress`, `Done`).
- **Business Logic & Side Effects:** Client cannot define custom columns or set owner ID. The board is saved in MongoDB with default column schema.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `title` | String | Yes | None | Trimmed, 1 to 100 characters | Name of the board |
  | `description` | String | No | `""` | Trimmed, max 500 characters | Optional board description |

#### C. Request Payload Example
```json
{
  "title": "Mobile App Launch",
  "description": "Tasks and sprint backlog for iOS and Android release"
}
```

#### D. Success Response
- **HTTP Status Code:** `201 Created`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the created board object with embedded default columns and owner ID.

```json
{
  "statusCode": 201,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "title": "Todo", "key": "todo", "order": 0 },
      { "title": "In Progress", "key": "in-progress", "order": 1 },
      { "title": "Done", "key": "done", "order": 2 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-10-25T10:15:00.000Z"
  },
  "message": "Board created successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when title is missing, empty, or client sends unrecognized fields (`columns`, `owner`).
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Title is required"
  ]
}
```

##### Error: 401 Unauthorized
Triggered when no authentication token is provided.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Authorization header missing",
  "errors": []
}
```

---

### 9.2 List User Boards

#### A. Endpoint Information
- **API Name:** List User Boards
- **HTTP Method:** `GET`
- **Complete Endpoint URL:** `/api/v1/boards`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Retrieves all boards owned by the authenticated user, sorted by most recently updated (`updatedAt: -1`).
- **Business Logic & Side Effects:** Scoped strictly to `owner: req.user._id`. Boards of other users are excluded.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:** None.
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
GET /api/v1/boards HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns an array of board documents.

```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "671bb200e4b0234567890456",
      "title": "Mobile App Launch",
      "description": "Tasks and sprint backlog for iOS and Android release",
      "owner": "671aa100e4b0234567890123",
      "columns": [
        { "title": "Todo", "key": "todo", "order": 0 },
        { "title": "In Progress", "key": "in-progress", "order": 1 },
        { "title": "Done", "key": "done", "order": 2 }
      ],
      "createdAt": "2026-10-25T10:15:00.000Z",
      "updatedAt": "2026-10-25T10:15:00.000Z"
    }
  ],
  "message": "Boards fetched successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 401 Unauthorized
Triggered when authentication is missing or expired.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Authorization header missing",
  "errors": []
}
```

---

### 9.3 Get Board by ID

#### A. Endpoint Information
- **API Name:** Get Board by ID
- **HTTP Method:** `GET`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Retrieves detailed information for a single board owned by the user.
- **Business Logic & Side Effects:** Queries `{ _id: boardId, owner: userId }`. Returns 404 if board belongs to another user.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid 24-character hexadecimal MongoDB ObjectId | Target Board ID |
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
GET /api/v1/boards/671bb200e4b0234567890456 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the single requested board object.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "title": "Todo", "key": "todo", "order": 0 },
      { "title": "In Progress", "key": "in-progress", "order": 1 },
      { "title": "Done", "key": "done", "order": 2 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-10-25T10:15:00.000Z"
  },
  "message": "Board fetched successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `:boardId` is not a valid 24-character hexadecimal MongoDB ObjectId.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Invalid board ID format"
  ]
}
```

##### Error: 401 Unauthorized
Triggered when request is not authenticated.
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Authorization header missing",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered when the board does not exist or is owned by another user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 9.4 Update Board

#### A. Endpoint Information
- **API Name:** Update Board
- **HTTP Method:** `PATCH`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Updates the title and/or description of an existing board. At least one field must be provided. Columns and owner cannot be altered.
- **Business Logic & Side Effects:** Updates the board document in MongoDB and refreshes `updatedAt`.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid 24-character hexadecimal MongoDB ObjectId | Target Board ID |
- **Query Parameters:** None.
- **Request Body Requirements:** Required. Must contain at least `title` or `description`.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `title` | String | No | None | Trimmed, 1 to 100 characters | Updated board title |
  | `description` | String | No | None | Trimmed, max 500 characters | Updated board description |

#### C. Request Payload Example
```json
{
  "title": "Mobile App Release - Version 1.0",
  "description": "Updated release schedule for V1.0 launch"
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the updated board document.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Release - Version 1.0",
    "description": "Updated release schedule for V1.0 launch",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "title": "Todo", "key": "todo", "order": 0 },
      { "title": "In Progress", "key": "in-progress", "order": 1 },
      { "title": "Done", "key": "done", "order": 2 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-10-25T10:30:00.000Z"
  },
  "message": "Board updated successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when the request body is empty `{}` or unrecognized fields (`columns`, `owner`) are sent.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "At least one field (title or description) must be provided for update"
  ]
}
```

##### Error: 404 Not Found
Triggered if the board does not exist or belongs to another user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 9.5 Delete Board

#### A. Endpoint Information
- **API Name:** Delete Board
- **HTTP Method:** `DELETE`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Deletes a board and automatically cascade-deletes all tasks attached to the board.
- **Business Logic & Side Effects:** Removes the Board document and executes `Task.deleteMany({ boardId })` to clean up associated tasks.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid 24-character hexadecimal MongoDB ObjectId | Target Board ID |
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
DELETE /api/v1/boards/671bb200e4b0234567890456 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns confirmation message.

```json
{
  "statusCode": 200,
  "data": {
    "message": "Board deleted successfully"
  },
  "message": "Board deleted successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `:boardId` is not a valid MongoDB ObjectId.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Invalid board ID format"
  ]
}
```

##### Error: 404 Not Found
Triggered when the board does not exist or is not owned by the authenticated user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 9.6 Add Column

#### A. Endpoint Information
- **API Name:** Add Column
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/columns`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Adds a new workflow column to an existing board, up to a maximum of 5 columns.
- **Business Logic & Side Effects:** Verifies board ownership; ensures the board currently has fewer than 5 columns; generates a unique, stable slug key from the column name; sets order to the next available position (`maxOrder + 1`); saves the updated board atomically; returns the updated board.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid 24-character hexadecimal MongoDB ObjectId | Target Board ID |
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `name` | String | Yes | None | Trimmed, 1 to 50 characters | Name of the new column |

#### C. Request Payload Example
```json
{
  "name": "In Review"
}
```

#### D. Success Response
- **HTTP Status Code:** `201 Created`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the updated board document with the newly appended column.

```json
{
  "statusCode": 201,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "name": "To Do", "title": "To Do", "key": "todo", "order": 0 },
      { "name": "In Progress", "title": "In Progress", "key": "in-progress", "order": 1 },
      { "name": "Done", "title": "Done", "key": "done", "order": 2 },
      { "name": "In Review", "title": "In Review", "key": "in-review", "order": 3 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-11-01T10:30:00.000Z"
  },
  "message": "Column added successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when the column name is empty/invalid, or when the board already has 5 columns.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Board cannot have more than 5 columns",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered when the board does not exist or is not owned by the authenticated user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 9.7 Rename Column

#### A. Endpoint Information
- **API Name:** Rename Column
- **HTTP Method:** `PATCH`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/columns/:columnKey`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Renames an existing workflow column on a board without changing its stable key, order position, or existing task associations.
- **Business Logic & Side Effects:** Verifies board ownership and column existence; updates `name` (and backward-compatible `title`); preserves column `key` and `order`; does not modify tasks belonging to the column; returns the updated board.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid 24-character hexadecimal MongoDB ObjectId | Target Board ID |
  | `columnKey` | String | Yes | None | Non-empty string | Target Column Key (e.g. `todo`) |
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `name` | String | Yes | None | Trimmed, 1 to 50 characters | New name for the column |

#### C. Request Payload Example
```json
{
  "name": "Backlog"
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the updated board document with the renamed column.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "name": "Backlog", "title": "Backlog", "key": "todo", "order": 0 },
      { "name": "In Progress", "title": "In Progress", "key": "in-progress", "order": 1 },
      { "name": "Done", "title": "Done", "key": "done", "order": 2 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-11-01T10:35:00.000Z"
  },
  "message": "Column renamed successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when the name is empty or contains only whitespace.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Column name cannot be empty"
  ]
}
```

##### Error: 404 Not Found
Triggered when the board or the column key does not exist.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Column not found",
  "errors": []
}
```

---

### 9.8 Reorder Columns

#### A. Endpoint Information
- **API Name:** Reorder Columns
- **HTTP Method:** `PATCH`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/columns/reorder`
- **Authentication Required:** Yes (`Bearer <accessToken>` header or `accessToken` cookie)
- **Purpose and Functionality:** Reorders the columns of an existing board based on a full list of existing column keys.
- **Business Logic & Side Effects:**
  - Verifies board ownership.
  - Validates that `columnKeys` is an array of strings.
  - Ensures no duplicate column keys are provided.
  - Confirms that the list of keys is an exact match for the board's existing columns (all existing keys must be present, no extra or unknown keys).
  - Assigns contiguous 0-based sequential orders to each column based on array index.
  - An empty array is supported if and only if the board itself has zero columns.
  - Associated task data, `columnKey`, order, and `isCompleted` status are completely unmodified.
  - Persists and returns the updated board document.

#### B. Request Details
- **Path Parameters:**
  - `boardId` (string, required): 24-character hexadecimal MongoDB ObjectId.
- **Request Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "columnKeys": [
    "in-progress",
    "todo",
    "done"
  ]
}
```

#### C. Validation Rules
- `boardId`: Valid MongoDB ObjectId.
- `columnKeys`: Array of non-empty strings, maximum 5 items. Must be an exact permutation of existing board column keys without duplicates.
- Strict schema prevents additional unrecognized fields.

#### D. Success Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "name": "In Progress", "title": "In Progress", "key": "in-progress", "order": 0 },
      { "name": "To Do", "title": "To Do", "key": "todo", "order": 1 },
      { "name": "Done", "title": "Done", "key": "done", "order": 2 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-11-01T10:40:00.000Z"
  },
  "message": "Columns reordered successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when keys are duplicated, missing, unknown, or length does not match board column count.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "columnKeys cannot contain duplicate keys",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered when the board does not exist or does not belong to the authenticated user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 9.9 Delete Column

#### A. Endpoint Information
- **API Name:** Delete Column
- **HTTP Method:** `DELETE`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/columns/:columnKey`
- **Authentication Required:** Yes (`Bearer <accessToken>` header or `accessToken` cookie)
- **Purpose and Functionality:** Removes a column from a board using either a task move strategy or a permanent task delete strategy.
- **Business Logic & Side Effects:**
  - Verifies board ownership.
  - Verifies that the source column exists on the board.
  - **Option A (`action: "move"`):**
    - Verifies that `targetColumnKey` is provided and exists on the board.
    - Rejects moving tasks into the column being deleted.
    - Moves all tasks from `columnKey` to `targetColumnKey`, appending them after existing destination tasks and preserving their relative order.
    - Normalizes destination tasks strictly to sequential 0-based orders.
    - Preserves task IDs, titles, descriptions, priorities, due dates, and `isCompleted` status.
    - Removes the column from the board and normalizes remaining column orders.
  - **Option B (`action: "delete"`):**
    - Permanently deletes all tasks belonging to `columnKey`.
    - Removes the column from the board and normalizes remaining column orders.
  - Entire operation runs inside an atomic MongoDB session/transaction.
  - If the last remaining column is deleted, the board persists with `columns: []`. Zero columns is a valid board state.
  - Returns the updated board document.

#### B. Request Details
- **Path Parameters:**
  - `boardId` (string, required): 24-character hexadecimal MongoDB ObjectId.
  - `columnKey` (string, required): Identifier of column to delete.
- **Request Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body (Option A: Move Tasks):**
```json
{
  "action": "move",
  "targetColumnKey": "in-progress"
}
```
- **Request Body (Option B: Delete Tasks):**
```json
{
  "action": "delete"
}
```

#### C. Validation Rules
- `boardId`: Valid MongoDB ObjectId.
- `columnKey`: Non-empty string.
- `action`: Either `"move"` or `"delete"`.
- `targetColumnKey`: Required when `action === "move"`. Disallowed when `action === "delete"`.
- Strict schema prevents additional unrecognized fields.

#### D. Success Response (200 OK)
```json
{
  "statusCode": 200,
  "data": {
    "_id": "671bb200e4b0234567890456",
    "title": "Mobile App Launch",
    "description": "Tasks and sprint backlog for iOS and Android release",
    "owner": "671aa100e4b0234567890123",
    "columns": [
      { "name": "In Progress", "title": "In Progress", "key": "in-progress", "order": 0 },
      { "name": "Done", "title": "Done", "key": "done", "order": 1 }
    ],
    "createdAt": "2026-10-25T10:15:00.000Z",
    "updatedAt": "2026-11-01T10:45:00.000Z"
  },
  "message": "Column deleted successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when action is invalid, `targetColumnKey` is missing for move, or target is the source column.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Cannot move tasks to the column being deleted",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered when the board or the column key does not exist.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Column not found",
  "errors": []
}
```

---

## 10. Task and Card Management API Group

All task routes are nested hierarchically under their parent board:
`/api/v1/boards/:boardId/tasks`

Every request verifies that `:boardId` exists and belongs to the authenticated user before executing any task operation.

### 10.1 Create Task

#### A. Endpoint Information
- **API Name:** Create Task
- **HTTP Method:** `POST`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Creates a new task card under the specified board. Automatically calculates and assigns the next sequential `order` index in the destination column.
- **Business Logic & Side Effects:** Verifies parent board ownership; computes `order = lastTask.order + 1` (or 0 if empty); saves Task document in MongoDB.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `title` | String | Yes | None | Trimmed, 1 to 150 characters | Task card title |
  | `description` | String | No | `""` | Trimmed, max 2000 characters | Task card details |
  | `columnKey` | String (Enum) | No | `"todo"` | `"todo"`, `"in-progress"`, `"done"` | Initial column placement |
  | `priority` | String (Enum) | No | `"medium"` | `"low"`, `"medium"`, `"high"` | Priority level |
  | `dueDate` | String / Null | No | `null` | Valid ISO date string or `null` | Optional deadline |
  | `isCompleted` | Boolean | No | `false` | Boolean value | Independent task completion status |

#### C. Request Payload Example
```json
{
  "title": "Design login wireframes",
  "description": "Create Figma mockups for email and password login screens",
  "columnKey": "todo",
  "priority": "high",
  "dueDate": "2026-11-01T12:00:00.000Z",
  "isCompleted": false
}
```

#### D. Success Response
- **HTTP Status Code:** `201 Created`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the created task document with assigned `order` and `boardId`.

```json
{
  "statusCode": 201,
  "data": {
    "_id": "671cc300e4b0234567890789",
    "title": "Design login wireframes",
    "description": "Create Figma mockups for email and password login screens",
    "boardId": "671bb200e4b0234567890456",
    "columnKey": "todo",
    "order": 0,
    "priority": "high",
    "dueDate": "2026-11-01T12:00:00.000Z",
    "isCompleted": false,
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T10:45:00.000Z"
  },
  "message": "Task created successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when title is missing or empty, priority is invalid, or client attempts to inject `boardId` or `order` into the body.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Title cannot be empty",
    "Unrecognized field provided. Only title, description, columnKey, priority, and dueDate are allowed"
  ]
}
```

##### Error: 404 Not Found
Triggered when `:boardId` does not exist or belongs to another user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 10.2 List Tasks for a Board

#### A. Endpoint Information
- **API Name:** List Tasks for a Board
- **HTTP Method:** `GET`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Lists all tasks belonging to the board, sorted ascending by column and order index (`{ columnKey: 1, order: 1 }`). Supports optional column filtering via query parameter.
- **Business Logic & Side Effects:** Verifies parent board ownership; applies database filter `{ boardId, columnKey }`.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
- **Query Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `columnKey` | String | No | None | `"todo"`, `"in-progress"`, `"done"` | Filters tasks to given column |
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
GET /api/v1/boards/671bb200e4b0234567890456/tasks?columnKey=in-progress HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns an array of task objects sorted by order index.

```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "671cc300e4b0234567890789",
      "title": "Design login wireframes",
      "description": "Create Figma mockups for email and password login screens",
      "boardId": "671bb200e4b0234567890456",
      "columnKey": "in-progress",
      "order": 0,
      "priority": "high",
      "dueDate": "2026-11-01T12:00:00.000Z",
      "createdAt": "2026-10-25T10:45:00.000Z",
      "updatedAt": "2026-10-25T10:45:00.000Z"
    }
  ],
  "message": "Tasks fetched successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `columnKey` query parameter is not one of the allowed column values.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Column key must be one of: todo, in-progress, done",
  "errors": []
}
```

##### Error: 404 Not Found
Triggered when the parent board does not exist or is not owned by the user.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Board not found",
  "errors": []
}
```

---

### 10.3 Get Task by ID

#### A. Endpoint Information
- **API Name:** Get Task by ID
- **HTTP Method:** `GET`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Retrieves a single task card. Validates that the task belongs specifically to the requested board.
- **Business Logic & Side Effects:** Queries `{ _id: taskId, boardId }`. Prevents cross-board or cross-user data leakage.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
  | `taskId` | String | Yes | None | Valid MongoDB ObjectId | Target Task ID |
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
GET /api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the task document.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671cc300e4b0234567890789",
    "title": "Design login wireframes",
    "description": "Create Figma mockups for email and password login screens",
    "boardId": "671bb200e4b0234567890456",
    "columnKey": "todo",
    "order": 0,
    "priority": "high",
    "dueDate": "2026-11-01T12:00:00.000Z",
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T10:45:00.000Z"
  },
  "message": "Task fetched successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `:taskId` is not a valid 24-character hexadecimal MongoDB ObjectId.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Invalid task ID format"
  ]
}
```

##### Error: 404 Not Found
Triggered when the task does not exist or does not belong to the requested board (task-to-board mismatch).
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Task not found",
  "errors": []
}
```

---

### 10.4 Update Task Details

#### A. Endpoint Information
- **API Name:** Update Task Details
- **HTTP Method:** `PATCH`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Modifies task content (title, description, priority, dueDate). Does not alter column placement or order position (movement is handled exclusively via `/move`).
- **Business Logic & Side Effects:** Updates Task document in MongoDB and updates `updatedAt`.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
  | `taskId` | String | Yes | None | Valid MongoDB ObjectId | Target Task ID |
- **Query Parameters:** None.
- **Request Body Requirements:** Required. At least one field must be provided.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `title` | String | No | None | Trimmed, 1 to 150 characters | Updated task title |
  | `description` | String | No | None | Trimmed, max 2000 characters | Updated task description |
  | `priority` | String (Enum) | No | None | `"low"`, `"medium"`, `"high"` | Updated priority level |
  | `dueDate` | String / Null | No | None | Valid ISO date string or `null` | Updated deadline |
  | `isCompleted` | Boolean | No | None | Boolean value | Independent task completion status |

#### C. Request Payload Example
```json
{
  "title": "Design and review login wireframes",
  "priority": "medium",
  "dueDate": "2026-11-05T18:00:00.000Z",
  "isCompleted": true
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the updated task document.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671cc300e4b0234567890789",
    "title": "Design and review login wireframes",
    "description": "Create Figma mockups for email and password login screens",
    "boardId": "671bb200e4b0234567890456",
    "columnKey": "todo",
    "order": 0,
    "priority": "medium",
    "dueDate": "2026-11-05T18:00:00.000Z",
    "isCompleted": true,
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T11:00:00.000Z"
  },
  "message": "Task updated successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when request payload is empty `{}` or client attempts to pass disallowed fields (`columnKey`, `order`, `boardId`).
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "At least one valid field (title, description, priority, or dueDate) must be provided for update",
    "Unrecognized field provided. Only title, description, priority, and dueDate can be updated"
  ]
}
```

##### Error: 404 Not Found
Triggered if the task does not exist or does not belong to the board.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Task not found",
  "errors": []
}
```

---

### 10.5 Move or Reorder Task

#### A. Endpoint Information
- **API Name:** Move or Reorder Task
- **HTTP Method:** `PATCH`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks/:taskId/move`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Moves a task to a different column and/or updates its numeric order position. Normalizes contiguous order indexing in both source and destination columns.
- **Business Logic & Side Effects:**
  - If `order` is omitted: Appends the task to the destination column (`order = lastTask.order + 1`).
  - If `order` is provided: Inserts the task at that index and re-indexes all tasks in the destination column (`0, 1, 2, ...`).
  - If moved between columns: Re-indexes all remaining tasks in the source column (`normalizeColumnOrders`).

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Content-Type` | Yes | `application/json` | Specifies JSON body payload |
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
  | `taskId` | String | Yes | None | Valid MongoDB ObjectId | Target Task ID |
- **Query Parameters:** None.
- **Request Body Requirements:** Required.
  | Field | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---:|:---|:---|
  | `columnKey` | String (Enum) | Yes | None | `"todo"`, `"in-progress"`, `"done"` | Destination column |
  | `order` | Integer | No | None | Non-negative integer ($\ge 0$) | Position index in destination column. If omitted, appends to the end of the column. |

#### C. Request Payload Example
```json
{
  "columnKey": "in-progress",
  "order": 0
}
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns the moved task document with updated `columnKey` and `order`.

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671cc300e4b0234567890789",
    "title": "Design login wireframes",
    "description": "Create Figma mockups for email and password login screens",
    "boardId": "671bb200e4b0234567890456",
    "columnKey": "in-progress",
    "order": 0,
    "priority": "high",
    "dueDate": "2026-11-01T12:00:00.000Z",
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T11:15:00.000Z"
  },
  "message": "Task moved successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `columnKey` is missing or invalid, or `order` is a negative number or non-integer.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Column key must be one of: todo, in-progress, done",
    "Order must be a non-negative integer"
  ]
}
```

##### Error: 404 Not Found
Triggered if the task does not exist or does not belong to the board.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Task not found",
  "errors": []
}
```

---

### 10.6 Delete Task

#### A. Endpoint Information
- **API Name:** Delete Task
- **HTTP Method:** `DELETE`
- **Complete Endpoint URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose and Functionality:** Deletes a task card from MongoDB and automatically re-indexes remaining tasks in that column to maintain contiguous ordering (`0, 1, 2, ...`).
- **Business Logic & Side Effects:** Removes Task document and runs `normalizeColumnOrders` on the column.

#### B. Request Information
- **Required HTTP Headers:**
  | Header | Required | Format / Value | Description |
  |:---|:---:|:---|:---|
  | `Authorization` | No* | `Bearer <accessToken>` | Required if cookie is omitted |
- **Authentication Headers / Cookies:** Accepts `Authorization: Bearer <accessToken>` OR `Cookie: accessToken=<token>`.
- **Path Parameters:**
  | Parameter | Type | Required | Default | Validation / Constraints | Description |
  |:---|:---:|:---:|:---|:---|:---|
  | `boardId` | String | Yes | None | Valid MongoDB ObjectId | Parent Board ID |
  | `taskId` | String | Yes | None | Valid MongoDB ObjectId | Target Task ID |
- **Query Parameters:** None.
- **Request Body Requirements:** None. This endpoint does not accept a request body.

#### C. Request Example
```http
DELETE /api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### D. Success Response
- **HTTP Status Code:** `200 OK`
- **Response Headers / Cookies Set:** None.
- **Response Content Description:** Returns deletion confirmation message.

```json
{
  "statusCode": 200,
  "data": {
    "message": "Task deleted successfully"
  },
  "message": "Task deleted successfully",
  "success": true
}
```

#### E. Error Responses

##### Error: 400 Bad Request
Triggered when `:boardId` or `:taskId` is not a valid 24-character hexadecimal MongoDB ObjectId.
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Invalid task ID format"
  ]
}
```

##### Error: 404 Not Found
Triggered if the task does not exist or does not belong to the board.
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Task not found",
  "errors": []
}
```

---

## 11. Frontend Integration Guide

This guide provides practical examples for integrating a React frontend (e.g., built with Vite and Tailwind CSS) with the DevFlow backend using **Axios**.

### 1. Key Integration Rules
1. **Always Enable `withCredentials: true`:** Enables the browser to store and forward HttpOnly `accessToken` and `refreshToken` cookies across origins.
2. **Handle CORS Origin:** Configure `VITE_API_BASE_URL` in the frontend (e.g. `http://localhost:8000/api/v1`) and ensure `DEV_URL` in `backend/.env` matches your Vite dev server (`http://localhost:5173`).
3. **Automatic Token Rotation via Interceptors:** Intercept `401 Unauthorized` responses to silently refresh the session using `POST /api/v1/auth/refresh-token` before retrying the original request.

---

### 2. Axios Client Setup (`src/services/apiClient.js`)

```javascript
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for receiving and sending HttpOnly auth cookies
  headers: {
    "Content-Type": "application/json"
  }
});

// Response interceptor: automatically handles token expiration and retries
apiClient.interceptors.response.use(
  (response) => response.data, // Unwraps the ApiResponse object: { statusCode, data, message, success }
  async (error) => {
    const originalRequest = error.config;

    // Detect 401 Unauthorized, excluding login/register/refresh endpoints to prevent infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/register") &&
      !originalRequest.url.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        // Attempt silent session renewal using the HttpOnly refresh token cookie
        await apiClient.post("/auth/refresh-token");

        // Retry the original request with new cookies
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Session has fully expired or refresh token is revoked -> redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Extract standardized ApiError payload: { statusCode, success, message, errors }
    const errorData = error.response?.data || {
      statusCode: error.response?.status || 500,
      message: error.message || "Network error occurred",
      errors: []
    };

    return Promise.reject(errorData);
  }
);
```

---

### 3. Modular Frontend API Services

#### Authentication Service (`src/services/authService.js`)
```javascript
import { apiClient } from "./apiClient.js";

export const authService = {
  // Register a new user
  register: (userData) => apiClient.post("/auth/register", userData),

  // Log in with email and password
  login: (credentials) => apiClient.post("/auth/login", credentials),

  // Refresh access token manually
  refreshToken: (tokenData = {}) => apiClient.post("/auth/refresh-token", tokenData),

  // Log out and clear cookies
  logout: () => apiClient.delete("/auth/logout"),

  // Fetch current authenticated user
  getCurrentUser: () => apiClient.get("/auth/me")
};
```

#### Board Service (`src/services/boardService.js`)
```javascript
import { apiClient } from "./apiClient.js";

export const boardService = {
  // List all boards for the logged-in user
  getBoards: () => apiClient.get("/boards"),

  // Retrieve single board by ID
  getBoardById: (boardId) => apiClient.get(`/boards/${boardId}`),

  // Create a new board
  createBoard: (boardData) => apiClient.post("/boards", boardData),

  // Update board title or description
  updateBoard: (boardId, updateData) => apiClient.patch(`/boards/${boardId}`, updateData),

  // Delete board and all its tasks
  deleteBoard: (boardId) => apiClient.delete(`/boards/${boardId}`)
};
```

#### Task Service (`src/services/taskService.js`)
```javascript
import { apiClient } from "./apiClient.js";

export const taskService = {
  // List tasks for a board (optional columnKey filter: 'todo' | 'in-progress' | 'done')
  getBoardTasks: (boardId, columnKey) => {
    const params = columnKey ? { columnKey } : {};
    return apiClient.get(`/boards/${boardId}/tasks`, { params });
  },

  // Retrieve single task by ID
  getTaskById: (boardId, taskId) => apiClient.get(`/boards/${boardId}/tasks/${taskId}`),

  // Create task under a board
  createTask: (boardId, taskData) => apiClient.post(`/boards/${boardId}/tasks`, taskData),

  // Update task details (title, description, priority, dueDate)
  updateTask: (boardId, taskId, taskData) => apiClient.patch(`/boards/${boardId}/tasks/${taskId}`, taskData),

  // Move or reorder a task
  moveTask: (boardId, taskId, moveData) => apiClient.patch(`/boards/${boardId}/tasks/${taskId}/move`, moveData),

  // Delete a task
  deleteTask: (boardId, taskId) => apiClient.delete(`/boards/${boardId}/tasks/${taskId}`)
};
```

---

### 4. Helper Function: Form Error Handling

```javascript
/**
 * Safely extracts error strings from backend ApiError responses for user notifications.
 *
 * @param {Object} error - Caught error object from apiClient
 * @returns {string} Human-friendly error message
 */
export function extractErrorMessage(error) {
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.join(". ");
  }
  return error.message || "An unexpected error occurred. Please try again.";
}
```

---

## 12. End-to-End Workflow Walkthrough

Below is a complete 12-step sequence demonstrating the complete lifecycle from registration to board deletion using `curl`. A persistent cookie jar (`cookies.txt`) is used throughout the sequence to maintain session state.

### Step 1: Register User Account
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "sarahconnor",
    "email": "sarah@example.com",
    "password": "Password123!"
  }'
```

### Step 2: Fetch Current Authenticated User (`/me`)
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt
```

### Step 3: Create a Board
```bash
curl -X POST http://localhost:8000/api/v1/boards \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Q4 Product Launch",
    "description": "Sprint tracking for production milestone release"
  }'
```
*Assumed returned Board ID: `671bb200e4b0234567890456`*

### Step 4: List Boards
```bash
curl -X GET http://localhost:8000/api/v1/boards \
  -b cookies.txt
```

### Step 5: Create a Task in "Todo"
```bash
curl -X POST http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Setup OAuth2 login",
    "description": "Implement Google social login buttons on client",
    "priority": "high",
    "columnKey": "todo"
  }'
```
*Assumed returned Task ID: `671cc300e4b0234567890789`*

### Step 6: Fetch All Tasks on the Board
```bash
curl -X GET http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks \
  -b cookies.txt
```

### Step 7: Update Task Details
```bash
curl -X PATCH http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Setup OAuth2 login & audit logging",
    "priority": "medium",
    "dueDate": "2026-11-15T00:00:00.000Z"
  }'
```

### Step 8: Move Task to "In Progress"
```bash
curl -X PATCH http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789/move \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "columnKey": "in-progress"
  }'
```

### Step 9: Delete Task
```bash
curl -X DELETE http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 \
  -b cookies.txt
```

### Step 10: Delete Board
```bash
curl -X DELETE http://localhost:8000/api/v1/boards/671bb200e4b0234567890456 \
  -b cookies.txt
```

### Step 11: Refresh Authentication Tokens
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh-token \
  -b cookies.txt -c cookies.txt
```

### Step 12: Logout
```bash
curl -X DELETE http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt -c cookies.txt
```

---

## 13. Automated Testing Suite

The DevFlow backend is validated by an automated integration test suite written with **Vitest** and **Supertest**.

### Running the Test Suite
```bash
cd backend
npm test
```

### Test Configuration (`vitest.config.js`)
- **Environment:** Node.js ESM
- **Timeouts:** 30,000ms hook and test timeouts to support remote cloud database latencies.
- **Sequential Execution:** `fileParallelism: false` runs test files serially, preventing concurrent database mutations and race conditions.

### Test Database Safety Guard (`tests/setup.js`)
Tests connect to an isolated database configured via `TEST_DB_NAME` (`devflow_test`). The setup script strictly validates that:
```javascript
if (
  !TEST_DB_NAME ||
  TEST_DB_NAME === "devflow" ||
  TEST_DB_NAME === "production"
) {
  throw new Error("TEST ABORTED: Insecure test database name.");
}
```
If the connection is pointed at the development or production database, the test suite aborts immediately. Collections are cleaned safely between test runs and dropped upon suite completion.

### Test Coverage Breakdown (52 Total Tests)
- **Authentication Suite (`tests/auth.test.js` — 18 tests):** Registration, duplicate detection (username/email), validation rejections, password hashing, login, incorrect credentials, Bearer token auth, HttpOnly cookie auth, `/me` profile retrieval, refresh token rotation, replay attack prevention, and logout.
- **Board Management Suite (`tests/board.test.js` — 14 tests):** Board creation, default column verification (`todo`, `in-progress`, `done`), column immutability, board listing, single board retrieval, updates, invalid ObjectId rejection, cross-user isolation, and cascade cleanup of tasks upon board deletion.
- **Task Management Suite (`tests/task.test.js` — 20 tests):** Task creation with auto-incrementing order indices, title and description length constraints, column filtering, single task retrieval, task updates, column movement, specific order insertion, contiguous order normalization, task deletion, and task-to-board mismatch prevention.

### Test Results
```text
Test Files  3 passed (3)
     Tests  52 passed (52)
  Duration  ~25 - 60 seconds
```
