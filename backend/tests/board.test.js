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

        it("should preserve empty columns array for boards explicitly saved with zero columns on retrieval", async () => {
            const { user, authHeaders } = await createTestUser();

            const emptyInsert = await Board.collection.insertOne({
                title: "Board Empty Columns",
                description: "Board with explicit empty array",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const emptyId = emptyInsert.insertedId;

            const res = await request(app)
                .get(`/api/v1/boards/${emptyId}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toEqual([]);

            const rawDocInDb = await Board.collection.findOne({ _id: emptyId });
            expect(rawDocInDb.columns).toEqual([]);
        });

        it("should allow adding a column to an empty board with initial order 0", async () => {
            const { user, authHeaders } = await createTestUser();

            const emptyInsert = await Board.collection.insertOne({
                title: "Empty Board For Add",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const emptyId = emptyInsert.insertedId;

            const res = await request(app)
                .post(`/api/v1/boards/${emptyId}/columns`)
                .set(authHeaders)
                .send({ name: "First Column" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toHaveLength(1);
            expect(res.body.data.columns[0]).toMatchObject({
                name: "First Column",
                key: "first-column",
                order: 0
            });
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

    describe("PATCH /api/v1/boards/:boardId/columns/reorder", () => {
        it("should reorder three default columns with sequential order values", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: ["done", "todo", "in-progress"] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const cols = res.body.data.columns;
            expect(cols).toHaveLength(3);
            expect(cols[0]).toMatchObject({ key: "done", order: 0, name: "Done" });
            expect(cols[1]).toMatchObject({ key: "todo", order: 1, name: "To Do" });
            expect(cols[2]).toMatchObject({ key: "in-progress", order: 2, name: "In Progress" });
        });

        it("should reorder five columns with sequential order values", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // Add 2 columns to reach 5
            await request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Review" });
            await request(app).post(`/api/v1/boards/${board._id}/columns`).set(authHeaders).send({ name: "Testing" });

            const newOrder = ["testing", "review", "done", "in-progress", "todo"];
            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: newOrder });

            expect(res.status).toBe(200);
            expect(res.body.data.columns).toHaveLength(5);
            expect(res.body.data.columns.map((c) => c.key)).toEqual(newOrder);
            expect(res.body.data.columns.map((c) => c.order)).toEqual([0, 1, 2, 3, 4]);
        });

        it("should verify associated tasks remain in their original columns with orders intact after column reordering", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const tTodo0 = await createTestTask(board._id, { title: "Todo 0", columnKey: "todo", order: 0 });
            const tTodo1 = await createTestTask(board._id, { title: "Todo 1", columnKey: "todo", order: 1 });
            const tProg0 = await createTestTask(board._id, { title: "Prog 0", columnKey: "in-progress", order: 0 });

            await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: ["in-progress", "done", "todo"] });

            // Fetch tasks and ensure columnKey and order did not change
            const fetchedT0 = await Task.findById(tTodo0._id);
            const fetchedT1 = await Task.findById(tTodo1._id);
            const fetchedP0 = await Task.findById(tProg0._id);

            expect(fetchedT0.columnKey).toBe("todo");
            expect(fetchedT0.order).toBe(0);
            expect(fetchedT1.columnKey).toBe("todo");
            expect(fetchedT1.order).toBe(1);
            expect(fetchedP0.columnKey).toBe("in-progress");
            expect(fetchedP0.order).toBe(0);
        });

        it("should reject reordering with duplicate column keys with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: ["todo", "todo", "done"] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("duplicate");
        });

        it("should reject reordering with unknown column keys with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: ["todo", "in-progress", "nonexistent-column"] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("does not exist");
        });

        it("should reject reordering with missing column keys with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: ["todo", "in-progress"] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("match");
        });

        it("should reorder an empty board using an empty array", async () => {
            const { user, authHeaders } = await createTestUser();

            const emptyInsert = await Board.collection.insertOne({
                title: "Empty Board For Reorder",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const emptyId = emptyInsert.insertedId;

            const res = await request(app)
                .patch(`/api/v1/boards/${emptyId}/columns/reorder`)
                .set(authHeaders)
                .send({ columnKeys: [] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columns).toEqual([]);
        });
    });

    describe("DELETE /api/v1/boards/:boardId/columns/:columnKey", () => {
        it("should delete a column and move tasks to the destination, appending after existing tasks in sequential order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // Existing destination tasks
            const destTask1 = await createTestTask(board._id, { title: "Dest 1", columnKey: "in-progress", order: 0 });
            const destTask2 = await createTestTask(board._id, { title: "Dest 2", columnKey: "in-progress", order: 1 });

            // Source tasks in "todo"
            const srcTask1 = await createTestTask(board._id, { title: "Src 1", columnKey: "todo", order: 0, priority: "high" });
            const srcTask2 = await createTestTask(board._id, {
                title: "Src 2",
                columnKey: "todo",
                order: 1,
                isCompleted: true,
                dueDate: new Date("2026-12-31")
            });

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({
                    action: "move",
                    targetColumnKey: "in-progress"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // "todo" column should be removed, remaining columns normalized
            const remainingColumns = res.body.data.columns;
            expect(remainingColumns).toHaveLength(2);
            expect(remainingColumns.map((c) => c.key)).toEqual(["in-progress", "done"]);
            expect(remainingColumns.map((c) => c.order)).toEqual([0, 1]);

            // Destination column should now have all 4 tasks sequentially ordered
            const updatedTasks = await Task.find({ boardId: board._id, columnKey: "in-progress" }).sort({ order: 1 });
            expect(updatedTasks).toHaveLength(4);

            expect(updatedTasks[0]._id.toString()).toBe(destTask1._id.toString());
            expect(updatedTasks[0].order).toBe(0);

            expect(updatedTasks[1]._id.toString()).toBe(destTask2._id.toString());
            expect(updatedTasks[1].order).toBe(1);

            expect(updatedTasks[2]._id.toString()).toBe(srcTask1._id.toString());
            expect(updatedTasks[2].order).toBe(2);
            expect(updatedTasks[2].priority).toBe("high");

            expect(updatedTasks[3]._id.toString()).toBe(srcTask2._id.toString());
            expect(updatedTasks[3].order).toBe(3);
            expect(updatedTasks[3].isCompleted).toBe(true);
            expect(new Date(updatedTasks[3].dueDate).toISOString()).toBe(new Date("2026-12-31").toISOString());
        });

        it("should delete a column using the delete strategy and permanently remove all associated tasks", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const task1 = await createTestTask(board._id, { title: "To Delete 1", columnKey: "todo", order: 0 });
            const task2 = await createTestTask(board._id, { title: "To Delete 2", columnKey: "todo", order: 1 });
            const keepTask = await createTestTask(board._id, { title: "Keep Me", columnKey: "done", order: 0 });

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({
                    action: "delete"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Column should be gone
            expect(res.body.data.columns.find((c) => c.key === "todo")).toBeUndefined();
            expect(res.body.data.columns).toHaveLength(2);

            // Tasks 1 and 2 should be permanently deleted from DB
            const checkTask1 = await Task.findById(task1._id);
            const checkTask2 = await Task.findById(task2._id);
            expect(checkTask1).toBeNull();
            expect(checkTask2).toBeNull();

            // Task in "done" must remain
            const checkKeepTask = await Task.findById(keepTask._id);
            expect(checkKeepTask).not.toBeNull();
        });

        it("should delete an empty column without error", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/in-progress`)
                .set(authHeaders)
                .send({ action: "delete" });

            expect(res.status).toBe(200);
            expect(res.body.data.columns).toHaveLength(2);
            expect(res.body.data.columns.map((c) => c.key)).toEqual(["todo", "done"]);
            expect(res.body.data.columns.map((c) => c.order)).toEqual([0, 1]);
        });

        it("should delete a default column", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/done`)
                .set(authHeaders)
                .send({ action: "delete" });

            expect(res.status).toBe(200);
            expect(res.body.data.columns).toHaveLength(2);
            expect(res.body.data.columns.find((c) => c.key === "done")).toBeUndefined();
        });

        it("should delete the final remaining column and persist board with columns: []", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // Delete 1st
            await request(app).delete(`/api/v1/boards/${board._id}/columns/todo`).set(authHeaders).send({ action: "delete" });
            // Delete 2nd
            await request(app).delete(`/api/v1/boards/${board._id}/columns/in-progress`).set(authHeaders).send({ action: "delete" });
            // Delete 3rd (final)
            const resFinal = await request(app).delete(`/api/v1/boards/${board._id}/columns/done`).set(authHeaders).send({ action: "delete" });

            expect(resFinal.status).toBe(200);
            expect(resFinal.body.data.columns).toEqual([]);

            // Verify in MongoDB database
            const docInDb = await Board.collection.findOne({ _id: board._id });
            expect(docInDb.columns).toEqual([]);

            // Reading the empty board must not recreate defaults
            const resRead = await request(app).get(`/api/v1/boards/${board._id}`).set(authHeaders);
            expect(resRead.status).toBe(200);
            expect(resRead.body.data.columns).toEqual([]);
        });

        it("should reject moving tasks into nonexistent destination with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ action: "move", targetColumnKey: "phantom-column" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("does not exist");
        });

        it("should reject moving tasks into the source column itself with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ action: "move", targetColumnKey: "todo" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Cannot move tasks to the column being deleted");
        });

        it("should reject deleting column on another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(user2.authHeaders)
                .send({ action: "delete" });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("should reject deleting a nonexistent column with 404", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/ghost-col`)
                .set(authHeaders)
                .send({ action: "delete" });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain("Column not found");
        });

        it("should reject invalid deletion action with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ action: "archive" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject move action when targetColumnKey is missing with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .set(authHeaders)
                .send({ action: "move" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject delete column when unauthenticated with 401", async () => {
            const user = await createTestUser();
            const board = await createTestBoard(user.user._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/columns/todo`)
                .send({ action: "delete" });

            expect(res.status).toBe(401);
        });
    });
});
