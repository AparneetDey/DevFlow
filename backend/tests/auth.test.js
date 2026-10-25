import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { User } from "../src/models/user.model.js";
import { cleanDatabase, createTestUser, getCookieValue } from "./helpers.js";

describe("Authentication API", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    describe("POST /api/v1/auth/register", () => {
        it("should successfully register a new user and set auth cookies", async () => {
            const userData = {
                username: "johndoe",
                email: "johndoe@example.com",
                password: "SecurePassword123!"
            };

            const res = await request(app)
                .post("/api/v1/auth/register")
                .send(userData);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.username).toBe(userData.username);
            expect(res.body.data.user.email).toBe(userData.email);
            expect(res.body.data.user.password).toBeUndefined();
            expect(res.body.data.user.refreshToken).toBeUndefined();
            expect(typeof res.body.data.accessToken).toBe("string");
            expect(typeof res.body.data.refreshToken).toBe("string");

            // Verify cookies
            const accessCookie = getCookieValue(res, "accessToken");
            const refreshCookie = getCookieValue(res, "refreshToken");
            expect(accessCookie).toBeDefined();
            expect(accessCookie.isHttpOnly).toBe(true);
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie.isHttpOnly).toBe(true);

            // Verify database persistence and hashed refresh token
            const dbUser = await User.findOne({ email: userData.email }).select("+password +refreshToken");
            expect(dbUser).not.toBeNull();
            expect(dbUser.password.startsWith("$2b$")).toBe(true);
            expect(dbUser.refreshToken).toBe(User.hashRefreshToken(res.body.data.refreshToken));
        });

        it("should reject registration with duplicate username", async () => {
            await createTestUser({ username: "existinguser", email: "user1@example.com" });

            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({
                    username: "existinguser",
                    email: "user2@example.com",
                    password: "SecurePassword123!"
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message.toLowerCase()).toContain("username");
        });

        it("should reject registration with duplicate email", async () => {
            await createTestUser({ username: "userone", email: "common@example.com" });

            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({
                    username: "usertwo",
                    email: "common@example.com",
                    password: "SecurePassword123!"
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message.toLowerCase()).toContain("email");
        });

        it("should reject invalid registration data with 400", async () => {
            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({
                    username: "u", // too short
                    email: "invalid-email",
                    password: "123" // too short
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThan(0);
        });
    });

    describe("POST /api/v1/auth/login", () => {
        it("should login with valid credentials and return tokens and cookies", async () => {
            const password = "StrongLoginPass123!";
            const { user } = await createTestUser({ password });

            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(user.email);
            expect(res.body.data.user.password).toBeUndefined();
            expect(res.body.data.user.refreshToken).toBeUndefined();
            expect(typeof res.body.data.accessToken).toBe("string");
            expect(typeof res.body.data.refreshToken).toBe("string");

            const accessCookie = getCookieValue(res, "accessToken");
            const refreshCookie = getCookieValue(res, "refreshToken");
            expect(accessCookie.isHttpOnly).toBe(true);
            expect(refreshCookie.isHttpOnly).toBe(true);
        });

        it("should reject login with incorrect password", async () => {
            const { user } = await createTestUser({ password: "CorrectPassword123!" });

            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: user.email,
                    password: "WrongPassword999!"
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Invalid email or password");
        });

        it("should reject login with non-existent email", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: "nobody@example.com",
                    password: "AnyPassword123!"
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it("should reject login with missing fields with 400", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: "test@example.com"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("GET /api/v1/auth/me", () => {
        it("should return current user when authenticated via Bearer token", async () => {
            const { user, authHeaders } = await createTestUser();

            const res = await request(app)
                .get("/api/v1/auth/me")
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(user.email);
            expect(res.body.data.username).toBe(user.username);
            expect(res.body.data.password).toBeUndefined();
            expect(res.body.data.refreshToken).toBeUndefined();
        });

        it("should return current user when authenticated via cookie", async () => {
            const { user, authCookie } = await createTestUser();

            const res = await request(app)
                .get("/api/v1/auth/me")
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(user.email);
        });

        it("should reject /me when no token or cookie is provided", async () => {
            const res = await request(app).get("/api/v1/auth/me");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it("should reject /me with an invalid or malformed token", async () => {
            const res = await request(app)
                .get("/api/v1/auth/me")
                .set("Authorization", "Bearer invalid.token.payload");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe("POST /api/v1/auth/refresh-token", () => {
        it("should rotate refresh token and issue new token pair", async () => {
            const { user, refreshToken } = await createTestUser();

            const res = await request(app)
                .post("/api/v1/auth/refresh-token")
                .send({ refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data.accessToken).toBe("string");
            expect(typeof res.body.data.refreshToken).toBe("string");
            expect(res.body.data.refreshToken).not.toBe(refreshToken);

            // Verify stored hash updated in DB
            const updatedUser = await User.findById(user._id).select("+refreshToken");
            expect(updatedUser.refreshToken).toBe(User.hashRefreshToken(res.body.data.refreshToken));

            // Replay old refresh token - must be rejected
            const replayRes = await request(app)
                .post("/api/v1/auth/refresh-token")
                .send({ refreshToken });

            expect(replayRes.status).toBe(401);
        });

        it("should rotate refresh token supplied via cookie", async () => {
            const { refreshToken } = await createTestUser();

            const res = await request(app)
                .post("/api/v1/auth/refresh-token")
                .set("Cookie", `refreshToken=${refreshToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data.accessToken).toBe("string");
            expect(typeof res.body.data.refreshToken).toBe("string");
        });

        it("should reject rotation when refresh token is missing with 400", async () => {
            const res = await request(app)
                .post("/api/v1/auth/refresh-token")
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject rotation with invalid or malformed refresh token with 401", async () => {
            const res = await request(app)
                .post("/api/v1/auth/refresh-token")
                .send({ refreshToken: "invalid.token.payload" });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe("DELETE /api/v1/auth/logout", () => {
        it("should logout user, clear DB refreshToken, and clear cookies", async () => {
            const { user, authHeaders, refreshToken } = await createTestUser();

            const res = await request(app)
                .delete("/api/v1/auth/logout")
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify DB refreshToken is cleared ($unset in Mongoose leaves field undefined)
            const dbUser = await User.findById(user._id).select("+refreshToken");
            expect(dbUser.refreshToken).toBeUndefined();

            // Verify cookies are expired/cleared
            const accessCookie = getCookieValue(res, "accessToken");
            const refreshCookie = getCookieValue(res, "refreshToken");
            expect(accessCookie.value === "" || accessCookie.maxAge === "0" || new Date(accessCookie.expires) <= new Date()).toBe(true);
            expect(refreshCookie.value === "" || refreshCookie.maxAge === "0" || new Date(refreshCookie.expires) <= new Date()).toBe(true);

            // Attempting to refresh with old refresh token should fail
            const refreshRes = await request(app)
                .post("/api/v1/auth/refresh-token")
                .send({ refreshToken });
            expect(refreshRes.status).toBe(401);
        });

        it("should reject logout when unauthenticated", async () => {
            const res = await request(app).delete("/api/v1/auth/logout");

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
