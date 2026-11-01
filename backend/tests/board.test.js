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
            expect(res.body.data.columns[0]).toMatchObject({ name: "To Do", key: "todo", order: 0 });
            expect(res.body.data.columns[1]).toMatchObject({ name: "In Progress", key: "in-progress", order: 1 });
            expect(res.body.data.columns[2]).toMatchObject({ name: "Done", key: "done", order: 2 });
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

        it("should migrate and persist default columns for legacy boards missing columns field", async () => {
            const { user, authHeaders } = await createTestUser();

            // Insert directly bypassing Mongoose defaults to emulate a pre-migration legacy document
            const legacyInsert = await Board.collection.insertOne({
                title: "Legacy Board No Columns",
                description: "Old board",
                owner: user._id,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const legacyId = legacyInsert.insertedId;

            // Fetch via board API
            const res = await request(app)
                .get(`/api/v1/boards/${legacyId}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toHaveLength(3);
            expect(res.body.data.columns[0]).toMatchObject({ name: "To Do", key: "todo", order: 0 });
            expect(res.body.data.columns[1]).toMatchObject({ name: "In Progress", key: "in-progress", order: 1 });
            expect(res.body.data.columns[2]).toMatchObject({ name: "Done", key: "done", order: 2 });

            // Confirm columns were physically persisted to MongoDB collection
            const rawDocInDb = await Board.collection.findOne({ _id: legacyId });
            expect(rawDocInDb.columns).toBeDefined();
            expect(rawDocInDb.columns).toHaveLength(3);
            expect(rawDocInDb.columns[0].key).toBe("todo");
        });

        it("should migrate and persist default columns for legacy boards with empty columns array", async () => {
            const { user, authHeaders } = await createTestUser();

            const legacyInsert = await Board.collection.insertOne({
                title: "Legacy Board Empty Columns",
                description: "Old board with empty array",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const legacyId = legacyInsert.insertedId;

            const res = await request(app)
                .get(`/api/v1/boards/${legacyId}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toHaveLength(3);

            const rawDocInDb = await Board.collection.findOne({ _id: legacyId });
            expect(rawDocInDb.columns).toHaveLength(3);
        });

        it("should not modify or overwrite boards that already have custom columns", async () => {
            const { user, authHeaders } = await createTestUser();

            const customColumns = [
                { name: "Backlog", title: "Backlog", key: "backlog", order: 0 },
                { name: "Dev", title: "Dev", key: "dev", order: 1 },
                { name: "QA", title: "QA", key: "qa", order: 2 },
                { name: "Shipped", title: "Shipped", key: "shipped", order: 3 }
            ];

            const customInsert = await Board.collection.insertOne({
                title: "Custom Columns Board",
                description: "4 custom cols",
                owner: user._id,
                columns: customColumns,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const customId = customInsert.insertedId;

            const res = await request(app)
                .get(`/api/v1/boards/${customId}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toHaveLength(4);
            expect(res.body.data.columns.map((c) => c.key)).toEqual(["backlog", "dev", "qa", "shipped"]);

            const rawDocInDb = await Board.collection.findOne({ _id: customId });
            expect(rawDocInDb.columns).toHaveLength(4);
            expect(rawDocInDb.columns[0].key).toBe("backlog");
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

    describe("POST /api/v1/boards/:boardId/columns", () => {
        it("should add a new column to a board with stable key and sequential order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "In Review" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toHaveLength(4);
            const addedCol = res.body.data.columns[3];
            expect(addedCol.name).toBe("In Review");
            expect(addedCol.key).toBe("in-review");
            expect(addedCol.order).toBe(3);
        });

        it("should allow adding columns up to the maximum limit of 5", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id); // Starts with 3 columns

            // 4th column
            const res4 = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Review" });
            expect(res4.status).toBe(201);
            expect(res4.body.data.columns).toHaveLength(4);

            // 5th column
            const res5 = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Testing" });
            expect(res5.status).toBe(201);
            expect(res5.body.data.columns).toHaveLength(5);
        });

        it("should reject adding a sixth column with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // Add 4th and 5th
            await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Col 4" });
            await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Col 5" });

            // 6th attempt must fail
            const res6 = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Col 6" });

            expect(res6.status).toBe(400);
            expect(res6.body.success).toBe(false);
            expect(res6.body.message).toContain("5 columns");
        });

        it("should reject adding column with empty or invalid name with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const resEmpty = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "   " });
            expect(resEmpty.status).toBe(400);

            const resMissing = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({});
            expect(resMissing.status).toBe(400);
        });

        it("should reject adding column to another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(user2.authHeaders)
                .send({ name: "Unauthorized Column" });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("should reject adding column when unauthenticated with 401", async () => {
            const user = await createTestUser();
            const board = await createTestBoard(user.user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .send({ name: "Unauth Col" });

            expect(res.status).toBe(401);
        });

        it("should handle concurrent column additions with distinct names without order collision", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const [resA, resB] = await Promise.all([
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Testing" }),
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "QA Review" })
            ]);

            expect(resA.status).toBe(201);
            expect(resB.status).toBe(201);

            const finalBoard = await Board.findById(board._id);
            expect(finalBoard.columns).toHaveLength(5);

            const orders = finalBoard.columns.map((c) => c.order);
            const uniqueOrders = new Set(orders);
            expect(uniqueOrders.size).toBe(5);
            expect(orders.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);

            const keys = finalBoard.columns.map((c) => c.key);
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(5);
        });

        it("should handle concurrent column additions with identical names without key collision", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const [resA, resB] = await Promise.all([
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Review" }),
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Review" })
            ]);

            expect(resA.status).toBe(201);
            expect(resB.status).toBe(201);

            const finalBoard = await Board.findById(board._id);
            expect(finalBoard.columns).toHaveLength(5);

            const keys = finalBoard.columns.map((c) => c.key);
            expect(keys).toContain("review");
            expect(keys).toContain("review-1");

            const orders = finalBoard.columns.map((c) => c.order);
            expect(orders.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        });

        it("should enforce 5-column cap under concurrent additions at column limit boundary", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "Column 4" });

            const [resA, resB] = await Promise.all([
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Slot A" }),
                request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Slot B" })
            ]);

            const statuses = [resA.status, resB.status];
            expect(statuses).toContain(201);
            expect(statuses).toContain(400);

            const finalBoard = await Board.findById(board._id);
            expect(finalBoard.columns).toHaveLength(5);
        });
    });

    describe("PATCH /api/v1/boards/:boardId/columns/:columnKey", () => {
        it("should rename an existing column while preserving key and order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ name: "Backlog" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const renamedCol = res.body.data.columns.find((c) => c.key === "todo");
            expect(renamedCol).toBeDefined();
            expect(renamedCol.name).toBe("Backlog");
            expect(renamedCol.key).toBe("todo"); // Key must not change
            expect(renamedCol.order).toBe(0); // Order must not change
        });

        it("should reject renaming with empty or whitespace name with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ name: "   " });

            expect(res.status).toBe(400);
        });

        it("should reject renaming a non-existent column key with 404", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/non-existent-key`)
                .set(authHeaders)
                .send({ name: "New Name" });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("Column not found");
        });

        it("should reject renaming another user's column with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/todo`)
                .set(user2.authHeaders)
                .send({ name: "Hacked Column" });

            expect(res.status).toBe(404);
        });

        it("should reject renaming when unauthenticated with 401", async () => {
            const user = await createTestUser();
            const board = await createTestBoard(user.user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/todo`)
                .send({ name: "New Name" });

            expect(res.status).toBe(401);
        });
    });
});
