# DevFlow Backend API Documentation

Welcome to the backend API documentation for **DevFlow**, a Trello-inspired Kanban task management application.

DevFlow provides a structured RESTful API for user authentication, board organization, and Kanban card workflow management.

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Environment Configuration](#environment-configuration)
3. [Architecture and Design Principles](#architecture-and-design-principles)
4. [Authentication and Security Mechanism](#authentication-and-security-mechanism)
5. [Standard API Response Format](#standard-api-response-format)
6. [Complete API Summary Table](#complete-api-summary-table)
7. [Authentication API Group](#authentication-api-group)
   - [POST /api/v1/auth/register](#1-register-user)
   - [POST /api/v1/auth/login](#2-login-user)
   - [POST /api/v1/auth/refresh-token](#3-refresh-access-token)
   - [DELETE /api/v1/auth/logout](#4-logout-user)
   - [GET /api/v1/auth/me](#5-get-current-user)
8. [Board Management API Group](#board-management-api-group)
   - [POST /api/v1/boards](#1-create-board)
   - [GET /api/v1/boards](#2-list-user-boards)
   - [GET /api/v1/boards/:boardId](#3-get-board-by-id)
   - [PATCH /api/v1/boards/:boardId](#4-update-board)
   - [DELETE /api/v1/boards/:boardId](#5-delete-board)
9. [Task and Card Management API Group](#task-and-card-management-api-group)
   - [POST /api/v1/boards/:boardId/tasks](#1-create-task)
   - [GET /api/v1/boards/:boardId/tasks](#2-list-tasks-for-a-board)
   - [GET /api/v1/boards/:boardId/tasks/:taskId](#3-get-task-by-id)
   - [PATCH /api/v1/boards/:boardId/tasks/:taskId](#4-update-task-details)
   - [PATCH /api/v1/boards/:boardId/tasks/:taskId/move](#5-move-or-reorder-task)
   - [DELETE /api/v1/boards/:boardId/tasks/:taskId](#6-delete-task)
10. [Frontend Integration Guide](#frontend-integration-guide)
11. [Workflow Walkthrough Examples](#workflow-walkthrough-examples)
12. [Automated Testing](#automated-testing)

---

## API Overview

- **Application Name:** DevFlow
- **Technology Stack:**
  - Runtime: Node.js (ES Modules, `type: "module"`)
  - Framework: Express.js (v5.x)
  - Database: MongoDB via Mongoose ODM (v9.x)
  - Validation: Zod (v4.x)
  - Authentication: JWT (`jsonwebtoken`) & `bcrypt`
  - Cookie Parsing: `cookie-parser`
  - Testing: Vitest & Supertest
- **API Version:** `v1`
- **Base URL:** `http://localhost:<PORT>/api/v1`
  - Default Local URL: `http://localhost:8000/api/v1` *(where `<PORT>` is defined in `backend/.env` or defaults to `8000`)*
- **Supported Media Type:** `application/json`

---

## Environment Configuration

The backend relies on environment variables loaded via `dotenv`. The table below outlines all environment variables utilized by the server and testing framework:

| Variable | Required | Purpose | Example / Default |
|:---|:---:|:---|:---|
| `PORT` | No | Port on which the Express server listens. | `8000` (defaults to `8000` if omitted) |
| `MONGO_DB_URI` | **Yes** | MongoDB connection string (Atlas cluster or local). | `mongodb+srv://<user>:<password>@cluster0.example.mongodb.net` |
| `DEV_URL` | No | Allowed frontend origin for CORS handling. | `http://localhost:5173` |
| `ACCESS_TOKEN_SECRET` | **Yes** | Symmetric secret key used to sign and verify short-lived access tokens. | `<strong_random_secret_string>` |
| `ACCESS_TOKEN_EXPIRY` | No | Lifespan duration for JWT access tokens. | `1d` (defaults to `1d`) |
| `REFRESH_TOKEN_SECRET` | **Yes** | Symmetric secret key used to sign and verify longer-lived refresh tokens. | `<strong_random_secret_string>` |
| `REFRESH_TOKEN_EXPIRY` | No | Lifespan duration for JWT refresh tokens. | `10d` (defaults to `10d`) |
| `NODE_ENV` | No | Application runtime environment (`development`, `production`, `test`). Affects cookie `secure` / `sameSite` flags and error stack traces. | `development` |
| `TEST_DB_NAME` | No | Name of the isolated database used for automated tests. Tests strictly abort if pointed at `devflow` or `production`. | `devflow_test` |

> **Security Notice:** Never commit actual `.env` files with real credentials to version control. Reference `backend/.env.example` as a template.

---

## Architecture and Design Principles

The backend follows a strict layered separation of concerns:

$$\text{Routes} \longrightarrow \text{Middleware} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Models} \longrightarrow \text{MongoDB}$$

1. **Routes (`src/routes/`):** Define URL endpoints, HTTP verbs, parameter schemas, and pipeline middleware.
2. **Middleware (`src/middlewares/`):**
   - `verifyJWT`: Verifies access token from cookies or Authorization header.
   - `validate`: Enforces strict request body schema checks via Zod.
   - `validateParams`: Enforces route parameter checks (e.g., verifying MongoDB ObjectIds).
   - `notFoundHandler`: Catches unmatched URLs and forwards a structured 404 error.
   - `errorHandler`: Centralized error serializer with environment-aware stack traces.
3. **Controllers (`src/controllers/`):** Manage request parsing, invoke service layer methods, set cookies, and format responses via `ApiResponse`.
4. **Services (`src/services/`):** Contain all core domain logic, authorization validation, database operations, and error throwing via `ApiError`.
5. **Models (`src/models/`):** Define Mongoose schemas, indexes, schema hooks, and cryptographic helpers.

---

## Authentication and Security Mechanism

DevFlow implements a dual-token JWT authentication architecture with HttpOnly cookies and Bearer header support:

### 1. Dual-Token Architecture
- **Access Token:** Short-lived JWT (default 1 day). Contains `{ _id, email, username }`. Used to authorize all protected endpoints.
- **Refresh Token:** Long-lived JWT (default 10 days). Contains `{ _id, jti }`. Used solely at `POST /api/v1/auth/refresh-token` to rotate tokens.
- **Refresh Token Hashing:** The database never stores raw refresh tokens. Instead, a deterministic SHA-256 hex digest (`User.hashRefreshToken(rawToken)`) is stored in MongoDB, and verified in constant time (`crypto.timingSafeEqual`).

### 2. Supported Client Transport Modes
DevFlow supports both modern browser-based cookie authentication and token-based client header authentication:
- **HttpOnly Cookies:** Automatically set on `register`, `login`, and `refresh-token`. Cookies are configured with:
  - `httpOnly: true` (prevents client-side XSS access)
  - `secure: true` in production (`false` in local development)
  - `sameSite: "none"` in production (`"lax"` in development)
  - `path: "/"`
- **Authorization Header:** Supported across all protected endpoints:
  ```http
  Authorization: Bearer <accessToken>
  ```
  If both a cookie and an Authorization header are provided, the Authorization header takes precedence.

### 3. Refresh Token Rotation & Replay Protection
- Refreshing tokens rotates **both** the access token and the refresh token.
- When `POST /api/v1/auth/refresh-token` is executed, the previous refresh token is immediately replaced by a new SHA-256 hash in the database.
- If a client replays an old refresh token, the hash comparison fails, returning `401 Unauthorized`.
- An atomic conditional update (`findOneAndUpdate({ _id, refreshToken: currentHash })`) prevents race conditions and concurrent rotation collisions.

### 4. Logout Invalidation
- When `DELETE /api/v1/auth/logout` is invoked, the user's stored refresh token hash in MongoDB is removed (`$unset: { refreshToken: 1 }`).
- Both `accessToken` and `refreshToken` cookies are expired and cleared.
- Once cleared, the refresh token cannot be used again to obtain new tokens. (Existing access tokens expire naturally at their designated lifetime).

---

## Standard API Response Format

Every endpoint in DevFlow returns a consistent JSON payload structure.

### Success Response Structure

Generated using the [`ApiResponse`](file:///e:/GitHub-Repo/DevFlow/backend/src/utils/ApiResponse.js) class:

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
- `message` *(string)*: Human-readable status description.
- `success` *(boolean)*: Always `true` for responses with status code $< 400$.

### Error Response Structure

Formatted by the centralized [`errorHandler`](file:///e:/GitHub-Repo/DevFlow/backend/src/middlewares/error.middleware.js) middleware:

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

- `statusCode` *(number)*: HTTP error code (e.g., `400`, `401`, `404`, `409`, `500`).
- `success` *(boolean)*: Always `false` for error responses.
- `message` *(string)*: Description of the operational error or reason for failure.
- `errors` *(array of strings)*: Granular validation messages (empty array for non-validation errors).
- `stack` *(string, optional)*: Included only when `NODE_ENV !== "production"` for debugging; omitted in production.

---

## Complete API Summary Table

The table below lists all **16 endpoints** currently implemented in the DevFlow backend:

| Method | Endpoint | Authentication | Description |
|:---|:---|:---:|:---|
| **Authentication** | | | |
| `POST` | `/api/v1/auth/register` | None (Public) | Register a new user account with credentials |
| `POST` | `/api/v1/auth/login` | None (Public) | Authenticate user credentials and issue tokens |
| `POST` | `/api/v1/auth/refresh-token` | None / Cookie | Rotate refresh token and receive a new token pair |
| `DELETE` | `/api/v1/auth/logout` | `verifyJWT` | Log out user, invalidate refresh token, and clear cookies |
| `GET` | `/api/v1/auth/me` | `verifyJWT` | Fetch currently authenticated user profile |
| **Board Management** | | | |
| `POST` | `/api/v1/boards` | `verifyJWT` | Create a new board with 3 default columns |
| `GET` | `/api/v1/boards` | `verifyJWT` | List all boards owned by the authenticated user |
| `GET` | `/api/v1/boards/:boardId` | `verifyJWT` | Retrieve details of a specific board by ID |
| `PATCH` | `/api/v1/boards/:boardId` | `verifyJWT` | Update board title and/or description |
| `DELETE` | `/api/v1/boards/:boardId` | `verifyJWT` | Delete a board and cascade delete its tasks |
| **Task Management** | | | |
| `POST` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | Create a new task under a board |
| `GET` | `/api/v1/boards/:boardId/tasks` | `verifyJWT` | List tasks on a board (supports `?columnKey=` filter) |
| `GET` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Retrieve a single task by ID |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Update task details (title, description, priority, dueDate) |
| `PATCH` | `/api/v1/boards/:boardId/tasks/:taskId/move` | `verifyJWT` | Move task to another column or reposition order |
| `DELETE` | `/api/v1/boards/:boardId/tasks/:taskId` | `verifyJWT` | Delete a task and re-index remaining column tasks |

---

## Authentication API Group

### 1. Register User

- **Method:** `POST`
- **URL:** `/api/v1/auth/register`
- **Authentication Required:** No
- **Purpose:** Registers a new user account, stores a bcrypt hash of the password, generates access and refresh tokens, stores a SHA-256 hash of the refresh token, and sets auth cookies.

#### Request Payload
- Content-Type: `application/json`

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `username` | String | Yes | Trimmed, lowercase, 3 to 30 characters | Unique handle for the user |
| `email` | String | Yes | Trimmed, lowercase, valid email format | Unique email address |
| `password` | String | Yes | Minimum 6 characters | User password (hashed with bcrypt) |

```json
{
  "username": "alexdeveloper",
  "email": "alex@example.com",
  "password": "SuperSecretPassword123!"
}
```

#### Success Response
- **Status:** `201 Created`
- **Cookies Set:**
  - `accessToken`: JWT string (HttpOnly, max-age 24 hours)
  - `refreshToken`: JWT string (HttpOnly, max-age 10 days)

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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Validation failure on username, email, or password.
  ```json
  {
    "statusCode": 400,
    "success": false,
    "message": "Validation Error",
    "errors": [
      "Username must be at least 3 characters long",
      "Password must be at least 6 characters long"
    ]
  }
  ```
- **409 Conflict:** User with username or email already exists.
  ```json
  {
    "statusCode": 409,
    "success": false,
    "message": "User with this email already exists",
    "errors": []
  }
  ```

---

### 2. Login User

- **Method:** `POST`
- **URL:** `/api/v1/auth/login`
- **Authentication Required:** No
- **Purpose:** Authenticates user credentials via email and password, generates a new access/refresh token pair, atomically updates the stored refresh token hash, and sets auth cookies.

#### Request Payload
- Content-Type: `application/json`

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `email` | String | Yes | Trimmed, lowercase, valid email | User email address |
| `password` | String | Yes | Minimum 1 character | Plaintext candidate password |

```json
{
  "email": "alex@example.com",
  "password": "SuperSecretPassword123!"
}
```

#### Success Response
- **Status:** `200 OK`
- **Cookies Set:** `accessToken` and `refreshToken`

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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User logged in successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Missing email or password.
- **401 Unauthorized:** Invalid email or incorrect password.
  ```json
  {
    "statusCode": 401,
    "success": false,
    "message": "Invalid email or password",
    "errors": []
  }
  ```

---

### 3. Refresh Access Token

- **Method:** `POST`
- **URL:** `/api/v1/auth/refresh-token`
- **Authentication Required:** No (authenticates via refresh token candidate)
- **Purpose:** Rotates the refresh token. Verifies the candidate refresh token against the stored hash in MongoDB, issues a brand new access token and refresh token, and atomically updates the stored hash.

#### Request Payload
- Either provide `refreshToken` in the request body OR send the `refreshToken` cookie.

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `refreshToken` | String | Optional* | Valid JWT string | Required in JSON body if cookie is not present |

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response
- **Status:** `200 OK`
- **Cookies Set:** Updates both `accessToken` and `refreshToken` with new rotated tokens.

```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Access token refreshed successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Refresh token missing from both request body and cookie.
- **401 Unauthorized:** Refresh token is expired, invalid, replayed, or revoked.
  ```json
  {
    "statusCode": 401,
    "success": false,
    "message": "Refresh token is invalid or has already been used",
    "errors": []
  }
  ```

---

### 4. Logout User

- **Method:** `DELETE`
- **URL:** `/api/v1/auth/logout`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Clears the stored refresh token hash from the database (`$unset: { refreshToken: 1 }`), preventing future token rotations, and clears `accessToken` and `refreshToken` cookies.

#### Request Headers / Cookies
- Header: `Authorization: Bearer <accessToken>` **OR** Cookie: `accessToken=<token>`

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`
- **Cookies Cleared:** `accessToken`, `refreshToken`

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

#### Error Responses
- **401 Unauthorized:** Unauthenticated, missing, or expired access token.

---

### 5. Get Current User

- **Method:** `GET`
- **URL:** `/api/v1/auth/me`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Fetches the profile of the currently authenticated user (password and refreshToken are excluded).

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **401 Unauthorized:** Invalid or missing access token.
- **404 Not Found:** User no longer exists in database.

---

## Board Management API Group

All board endpoints are protected by `verifyJWT`. A user can only access, modify, or delete boards that they own.

### Default Board Columns
Every newly created board automatically receives **three immutable default columns** in this exact order:
1. **Todo** — key: `"todo"`, order: `0`
2. **In Progress** — key: `"in-progress"`, order: `1`
3. **Done** — key: `"done"`, order: `2`

Clients cannot inject or modify column structures on boards.

---

### 1. Create Board

- **Method:** `POST`
- **URL:** `/api/v1/boards`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Creates a new board owned by the authenticated user with default columns.

#### Request Payload
- Content-Type: `application/json`
- Strict Validation: Only `title` and `description` are allowed. Unrecognized fields (such as `owner` or `columns`) are strictly rejected.

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `title` | String | Yes | Trimmed, 1 to 100 characters | Name of the board |
| `description` | String | No | Trimmed, maximum 500 characters, default `""` | Optional description |

```json
{
  "title": "Mobile App Launch",
  "description": "Tasks and sprint backlog for iOS and Android release"
}
```

#### Success Response
- **Status:** `201 Created`

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

#### Error Responses
- **400 Bad Request:** Empty title or title > 100 characters; description > 500 characters; or unrecognized fields provided.
- **401 Unauthorized:** Missing or invalid access token.

---

### 2. List User Boards

- **Method:** `GET`
- **URL:** `/api/v1/boards`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Lists all boards owned by the authenticated user, sorted by most recently updated (`updatedAt: -1`).

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **401 Unauthorized:** Missing or invalid authentication.

---

### 3. Get Board by ID

- **Method:** `GET`
- **URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Retrieves a single board by its ID for the authenticated owner.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid 24-character hexadecimal MongoDB ObjectId |

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **400 Bad Request:** Malformed `boardId` parameter.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board does not exist or belongs to another user (cross-user isolation).

---

### 4. Update Board

- **Method:** `PATCH`
- **URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Updates the `title` and/or `description` of a board. At least one field must be provided. Columns and owner cannot be modified.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid MongoDB ObjectId |

#### Request Payload
- Content-Type: `application/json`
- Strict Validation: At least one field (`title` or `description`) required. Unrecognized fields are rejected.

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `title` | String | No | Trimmed, 1 to 100 characters | Updated board title |
| `description` | String | No | Trimmed, maximum 500 characters | Updated board description |

```json
{
  "title": "Mobile App Release - Version 1.0",
  "description": "Updated release schedule for V1.0 launch"
}
```

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **400 Bad Request:** Empty request payload, invalid `boardId`, or unrecognized fields provided.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board does not exist or is not owned by the user.

---

### 5. Delete Board

- **Method:** `DELETE`
- **URL:** `/api/v1/boards/:boardId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Deletes the board and **automatically cascade-deletes all tasks associated with this board** (`Task.deleteMany({ boardId })`).

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid MongoDB ObjectId |

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **400 Bad Request:** Invalid `boardId` format.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board does not exist or belongs to another user.

---

## Task and Card Management API Group

All task routes are nested hierarchically under their parent board:
`/api/v1/boards/:boardId/tasks`

All endpoints verify that the user owns the board before performing any read or write operation.

### Task Schema & Ordering Rules
- **Allowed Columns:** `"todo"`, `"in-progress"`, `"done"`
- **Allowed Priorities:** `"low"`, `"medium"`, `"high"` (defaults to `"medium"`)
- **Automatic Appending on Creation:** New tasks are appended to the target column with `order = lastTask.order + 1` (or `0` if column is empty).
- **Contiguous Order Normalization:** When a task is moved to a specific order position or deleted, affected columns are re-indexed to contiguous integers (`0, 1, 2, ...`).

---

### 1. Create Task

- **Method:** `POST`
- **URL:** `/api/v1/boards/:boardId/tasks`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Creates a new task under the specified board. Automatically calculates the sequential order in the destination column.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |

#### Request Payload
- Content-Type: `application/json`
- Strict Validation: Clients cannot provide `boardId` or `order` in the body.

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `title` | String | Yes | Trimmed, 1 to 150 characters | Task title |
| `description` | String | No | Trimmed, max 2000 characters, default `""` | Task description |
| `columnKey` | String (Enum) | No | `"todo"`, `"in-progress"`, `"done"`, default `"todo"` | Target column |
| `priority` | String (Enum) | No | `"low"`, `"medium"`, `"high"`, default `"medium"` | Priority level |
| `dueDate` | String / Null | No | Valid ISO date string or `null`, default `null` | Optional deadline |

```json
{
  "title": "Design login wireframes",
  "description": "Create Figma mockups for email and password login screens",
  "columnKey": "todo",
  "priority": "high",
  "dueDate": "2026-11-01T12:00:00.000Z"
}
```

#### Success Response
- **Status:** `201 Created`

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
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T10:45:00.000Z"
  },
  "message": "Task created successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Empty title, title > 150 characters, description > 2000 characters, invalid priority, invalid columnKey, invalid date, or attempting to pass `boardId` / `order` in body.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board does not exist or is not owned by the user.

---

### 2. List Tasks for a Board

- **Method:** `GET`
- **URL:** `/api/v1/boards/:boardId/tasks`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Retrieves all tasks for the board sorted ascending by column and order (`{ columnKey: 1, order: 1 }`). Supports optional column filtering.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |

#### Query Parameters

| Parameter | Type | Required | Accepted Values | Description |
|:---|:---:|:---:|:---|:---|
| `columnKey` | String | No | `todo`, `in-progress`, `done` | Filters tasks to only include those in the specified column |

*Example Filter URL:* `/api/v1/boards/671bb200e4b0234567890456/tasks?columnKey=in-progress`

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

```json
{
  "statusCode": 200,
  "data": [
    {
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
    }
  ],
  "message": "Tasks fetched successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Invalid `boardId` format or invalid `columnKey` filter value.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board does not exist or is not owned by the user.

---

### 3. Get Task by ID

- **Method:** `GET`
- **URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Retrieves a single task by ID. Enforces board ownership and verifies that the task belongs to the given board (prevents task-to-board mismatch).

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |
| `taskId` | String (ObjectId) | Yes | Valid Task ObjectId |

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **400 Bad Request:** Invalid `boardId` or `taskId` parameter format.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board not found, task not found, or task does not belong to the board.

---

### 4. Update Task Details

- **Method:** `PATCH`
- **URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Modifies task content (title, description, priority, dueDate). Does not modify column or order (movement is handled via `/move`).

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |
| `taskId` | String (ObjectId) | Yes | Valid Task ObjectId |

#### Request Payload
- Content-Type: `application/json`
- Strict Validation: At least one field required. Disallows `boardId`, `columnKey`, and `order`.

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `title` | String | No | Trimmed, 1 to 150 characters | Updated task title |
| `description` | String | No | Trimmed, max 2000 characters | Updated task description |
| `priority` | String (Enum) | No | `"low"`, `"medium"`, `"high"` | Updated priority level |
| `dueDate` | String / Null | No | Valid ISO date string or `null` | Updated due date |

```json
{
  "title": "Design and review login wireframes",
  "priority": "medium",
  "dueDate": "2026-11-05T18:00:00.000Z"
}
```

#### Success Response
- **Status:** `200 OK`

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
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T11:00:00.000Z"
  },
  "message": "Task updated successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Empty update payload, invalid priority, invalid date, or disallowed fields.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board not found, task not found, or task does not belong to the board.

---

### 5. Move or Reorder Task

- **Method:** `PATCH`
- **URL:** `/api/v1/boards/:boardId/tasks/:taskId/move`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Moves a task to another column and/or updates its order index position.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |
| `taskId` | String (ObjectId) | Yes | Valid Task ObjectId |

#### Request Payload
- Content-Type: `application/json`

| Field | Type | Required | Constraints | Description |
|:---|:---:|:---:|:---|:---|
| `columnKey` | String (Enum) | Yes | `"todo"`, `"in-progress"`, `"done"` | Destination column |
| `order` | Integer | No | Non-negative integer ($\ge 0$) | Position index in destination column. If omitted, task is appended to end of column. |

*Example A — Moving to a new column and appending to the bottom:*
```json
{
  "columnKey": "in-progress"
}
```

*Example B — Moving or reordering to the top position:*
```json
{
  "columnKey": "done",
  "order": 0
}
```

#### Success Response
- **Status:** `200 OK`

```json
{
  "statusCode": 200,
  "data": {
    "_id": "671cc300e4b0234567890789",
    "title": "Design and review login wireframes",
    "description": "Create Figma mockups for email and password login screens",
    "boardId": "671bb200e4b0234567890456",
    "columnKey": "in-progress",
    "order": 1,
    "priority": "medium",
    "dueDate": "2026-11-05T18:00:00.000Z",
    "createdAt": "2026-10-25T10:45:00.000Z",
    "updatedAt": "2026-10-25T11:15:00.000Z"
  },
  "message": "Task moved successfully",
  "success": true
}
```

#### Error Responses
- **400 Bad Request:** Missing or invalid `columnKey`, negative `order`, or non-integer `order`.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board not found, task not found, or task does not belong to the board.

---

### 6. Delete Task

- **Method:** `DELETE`
- **URL:** `/api/v1/boards/:boardId/tasks/:taskId`
- **Authentication Required:** Yes (`verifyJWT`)
- **Purpose:** Deletes the specified task and automatically re-normalizes the order indices of remaining tasks in that column.

#### Path Parameters

| Parameter | Type | Required | Description |
|:---|:---:|:---:|:---|
| `boardId` | String (ObjectId) | Yes | Valid parent Board ObjectId |
| `taskId` | String (ObjectId) | Yes | Valid Task ObjectId |

#### Request Body
- `None`

#### Success Response
- **Status:** `200 OK`

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

#### Error Responses
- **400 Bad Request:** Invalid `boardId` or `taskId` parameter format.
- **401 Unauthorized:** Missing or invalid authentication.
- **404 Not Found:** Board not found, task not found, or task does not belong to the board.

---

## Frontend Integration Guide

This guide explains how a React/Vite frontend communicates with the DevFlow backend using **Axios**.

### 1. Key Integration Rules
1. **Always Set `withCredentials: true`:** Enables the browser to automatically include and store HttpOnly `accessToken` and `refreshToken` cookies on cross-origin requests.
2. **CORS Configuration:** Ensure `DEV_URL` in `backend/.env` matches your local frontend origin (default: `http://localhost:5173`).
3. **Automatic Token Refresh:** Use an Axios response interceptor to intercept `401 Unauthorized` responses and silently refresh the session via `POST /api/v1/auth/refresh-token`.

### 2. Recommended Axios Client Setup (`apiClient.js`)

```javascript
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for HttpOnly cookie exchange
  headers: {
    "Content-Type": "application/json"
  }
});

// Response interceptor for automatic refresh token rotation
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // If 401 Unauthorized occurs and we haven't retried yet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        // Attempt token rotation via cookies
        await apiClient.post("/auth/refresh-token");
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token expired or revoked -> redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error.message);
  }
);
```

---

## Workflow Walkthrough Examples

### Workflow 1: Authentication Workflow

```bash
# 1. Register a new user account
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "janedoe", "email": "jane@example.com", "password": "Password123!"}'

# 2. Login to retrieve tokens and session cookies
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "jane@example.com", "password": "Password123!"}'

# 3. Access current user profile using cookies
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt

# 4. Rotate session tokens
curl -X POST http://localhost:8000/api/v1/auth/refresh-token \
  -b cookies.txt -c cookies.txt

# 5. Logout and invalidate session
curl -X DELETE http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt -c cookies.txt
```

---

### Workflow 2: Board Management Workflow

```bash
# 1. Create a new project board
curl -X POST http://localhost:8000/api/v1/boards \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "DevFlow MVP", "description": "Kanban board for MVP delivery"}'

# 2. List all user boards
curl -X GET http://localhost:8000/api/v1/boards \
  -b cookies.txt

# 3. Retrieve specific board by ID
curl -X GET http://localhost:8000/api/v1/boards/671bb200e4b0234567890456 \
  -b cookies.txt

# 4. Update board details
curl -X PATCH http://localhost:8000/api/v1/boards/671bb200e4b0234567890456 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "DevFlow MVP V1.0"}'

# 5. Delete board (cascades task deletion)
curl -X DELETE http://localhost:8000/api/v1/boards/671bb200e4b0234567890456 \
  -b cookies.txt
```

---

### Workflow 3: Task & Kanban Movement Workflow

```bash
# 1. Create a task in 'todo'
curl -X POST http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "Implement auth middleware", "priority": "high", "columnKey": "todo"}'

# 2. List all tasks for board
curl -X GET http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks \
  -b cookies.txt

# 3. Filter tasks in progress
curl -X GET "http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks?columnKey=in-progress" \
  -b cookies.txt

# 4. Update task details
curl -X PATCH http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"description": "Verify Bearer header and cookie token fallback"}'

# 5. Move task to 'in-progress'
curl -X PATCH http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789/move \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"columnKey": "in-progress"}'

# 6. Delete task
curl -X DELETE http://localhost:8000/api/v1/boards/671bb200e4b0234567890456/tasks/671cc300e4b0234567890789 \
  -b cookies.txt
```

---

## Automated Testing

DevFlow includes a fully automated Vitest and Supertest testing suite covering all 16 endpoints.

To run the complete automated test suite:

```bash
cd backend
npm test
```

Tests execute against an isolated test database defined in `TEST_DB_NAME` (`devflow_test`), ensuring that development and production data are never mutated or deleted during test runs.
