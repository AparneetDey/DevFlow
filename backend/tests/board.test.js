import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../src/app.js";
import { Board, DEFAULT_COLUMNS } from "../src/models/board.model.js";
import { Task } from "../src/models/task.model.js";
import { cleanDatabase, createTestUser, createTestBoard, createTestTask } from "./helpers.js";

describe("Board API", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    describe("POST /api/v1/boards", () => {
        it("should create a board with default columns linked to user", async () => {
            const { user, authHeaders } = await createTestUser();

            const res = await request(app)
                .post("/api/v1/boards")
                .set(authHeaders)
                .send({
                    title: "Sprint Board",
                    description: "Team sprint board for Q4"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe("Sprint Board");
            expect(res.body.data.description).toBe("Team sprint board for Q4");
            expect(res.body.data.owner.toString()).toBe(user._id.toString());

            // Validate default columns structure and order
            expect(Array.isArray(res.body.data.columns)).toBe(true);
            expect(res.body.data.columns).toHaveLength(3);
            expect(res.body.data.columns[0]).toMatchObject({ title: "Todo", key: "todo", order: 0 });
            expect(res.body.data.columns[1]).toMatchObject({ title: "In Progress", key: "in-progress", order: 1 });
            expect(res.body.data.columns[2]).toMatchObject({ title: "Done", key: "done", order: 2 });
        });

        it("should reject creating board with missing or invalid title", async () => {
            const { authHeaders } = await createTestUser();

            const res = await request(app)
                .post("/api/v1/boards")
                .set(authHeaders)
                .send({
                    title: "",
                    description: "Invalid"
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject board creation when unauthenticated", async () => {
            const res = await request(app)
                .post("/api/v1/boards")
                .send({ title: "Unauth Board" });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe("GET /api/v1/boards", () => {
        it("should list only boards owned by the authenticated user", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();

            await createTestBoard(user1.user._id, { title: "User1 Board 1" });
            await createTestBoard(user1.user._id, { title: "User1 Board 2" });
            await createTestBoard(user2.user._id, { title: "User2 Board 1" });

            const res = await request(app)
                .get("/api/v1/boards")
                .set(user1.authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data.every((b) => b.owner.toString() === user1.user._id.toString())).toBe(true);
        });

        it("should reject listing boards when unauthenticated", async () => {
            const res = await request(app).get("/api/v1/boards");
            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/v1/boards/:boardId", () => {
        it("should retrieve a single board by ID for the owner", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id, { title: "Detailed Board" });

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id.toString()).toBe(board._id.toString());
            expect(res.body.data.title).toBe("Detailed Board");
        });

        it("should reject retrieving another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id, { title: "Private Board" });

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}`)
                .set(user2.authHeaders);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("should return 400 for an invalid board ID parameter", async () => {
            const { authHeaders } = await createTestUser();

            const res = await request(app)
                .get("/api/v1/boards/not-a-valid-id")
                .set(authHeaders);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should return 404 for a non-existent board ID", async () => {
            const { authHeaders } = await createTestUser();
            const nonExistentId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/v1/boards/${nonExistentId}`)
                .set(authHeaders);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("PATCH /api/v1/boards/:boardId", () => {
        it("should update board title and description", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id, { title: "Original Title", description: "Original Desc" });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}`)
                .set(authHeaders)
                .send({
                    title: "Updated Title",
                    description: "Updated Desc"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe("Updated Title");
            expect(res.body.data.description).toBe("Updated Desc");
        });

        it("should protect fixed columns from being overwritten or modified", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id, { title: "Col Protection Board" });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}`)
                .set(authHeaders)
                .send({
                    title: "Safe Title",
                    columns: [{ title: "Hacked", key: "hacked", order: 99 }]
                });

            // updateBoardSchema is strict or columns are rejected/ignored
            if (res.status === 400) {
                expect(res.body.success).toBe(false);
            } else {
                expect(res.status).toBe(200);
                const fetchedBoard = await Board.findById(board._id);
                expect(fetchedBoard.columns).toHaveLength(3);
                expect(fetchedBoard.columns[0].key).toBe("todo");
            }
        });

        it("should reject updating another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id, { title: "User1 Board" });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}`)
                .set(user2.authHeaders)
                .send({ title: "Hacked Title" });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("DELETE /api/v1/boards/:boardId", () => {
        it("should delete a board and cascade delete all its tasks", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id, { title: "Board to Delete" });

            // Create tasks attached to this board
            await createTestTask(board._id, { title: "Task 1" });
            await createTestTask(board._id, { title: "Task 2" });

            const initialTaskCount = await Task.countDocuments({ boardId: board._id });
            expect(initialTaskCount).toBe(2);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Confirm board is deleted
            const boardInDb = await Board.findById(board._id);
            expect(boardInDb).toBeNull();

            // Confirm tasks are cascade deleted
            const finalTaskCount = await Task.countDocuments({ boardId: board._id });
            expect(finalTaskCount).toBe(0);
        });

        it("should reject deleting another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id, { title: "User1 Board" });

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}`)
                .set(user2.authHeaders);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);

            // Verify board still exists
            const boardInDb = await Board.findById(board._id);
            expect(boardInDb).not.toBeNull();
        });
    });
});
