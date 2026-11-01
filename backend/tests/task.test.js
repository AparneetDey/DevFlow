import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../src/app.js";
import { Board } from "../src/models/board.model.js";
import { Task } from "../src/models/task.model.js";
import { cleanDatabase, createTestUser, createTestBoard, createTestTask } from "./helpers.js";

describe("Task API", () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    describe("POST /api/v1/boards/:boardId/tasks", () => {
        it("should create a task with default values and sequential order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // First task -> order 0
            const res1 = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: "First Task"
                });

            expect(res1.status).toBe(201);
            expect(res1.body.success).toBe(true);
            expect(res1.body.data.title).toBe("First Task");
            expect(res1.body.data.columnKey).toBe("todo");
            expect(res1.body.data.priority).toBe("medium");
            expect(res1.body.data.order).toBe(0);
            expect(res1.body.data.boardId.toString()).toBe(board._id.toString());
            expect(res1.body.data.isCompleted).toBe(false);

            // Second task -> order 1
            const res2 = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: "Second Task",
                    description: "Task description",
                    priority: "high"
                });

            expect(res2.status).toBe(201);
            expect(res2.body.data.order).toBe(1);
            expect(res2.body.data.priority).toBe("high");
        });

        it("should reject task creation with missing or empty title with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: ""
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject task creation with title > 150 characters", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: "A".repeat(151)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject task creation with description > 2000 characters", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: "Valid Title",
                    description: "D".repeat(2001)
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject client injecting boardId or order into body with 400", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders)
                .send({
                    title: "Injected Task",
                    order: 99
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("should reject creating a task under another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);

            const res = await request(app)
                .post(`/api/v1/boards/${board._id}/tasks`)
                .set(user2.authHeaders)
                .send({ title: "Unauthorized Task" });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("should reject task creation when unauthenticated with 401", async () => {
            const dummyId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post(`/api/v1/boards/${dummyId}/tasks`)
                .send({ title: "Unauth Task" });

            expect(res.status).toBe(401);
        });

        it("should trigger column persistence when creating a task on a legacy board missing columns", async () => {
            const { user, authHeaders } = await createTestUser();

            const legacyInsert = await Board.collection.insertOne({
                title: "Legacy Board For Task",
                owner: user._id,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const legacyId = legacyInsert.insertedId;

            const res = await request(app)
                .post(`/api/v1/boards/${legacyId}/tasks`)
                .set(authHeaders)
                .send({ title: "New Task On Legacy Board", columnKey: "todo" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);

            // Confirm board columns were persisted in MongoDB
            const boardInDb = await Board.collection.findOne({ _id: legacyId });
            expect(boardInDb.columns).toBeDefined();
            expect(boardInDb.columns).toHaveLength(3);
        });

        it("should reject task creation on a board with zero columns with 400", async () => {
            const { user, authHeaders } = await createTestUser();

            const emptyInsert = await Board.collection.insertOne({
                title: "Board With No Columns",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const boardId = emptyInsert.insertedId;

            const res = await request(app)
                .post(`/api/v1/boards/${boardId}/tasks`)
                .set(authHeaders)
                .send({ title: "Impossible Task" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("no columns");
        });
    });

    describe("GET /api/v1/boards/:boardId/tasks", () => {
        it("should list tasks for a board sorted by order ascending", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            await createTestTask(board._id, { title: "T2", order: 2, columnKey: "todo" });
            await createTestTask(board._id, { title: "T0", order: 0, columnKey: "todo" });
            await createTestTask(board._id, { title: "T1", order: 1, columnKey: "todo" });

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(3);
            expect(res.body.data[0].title).toBe("T0");
            expect(res.body.data[1].title).toBe("T1");
            expect(res.body.data[2].title).toBe("T2");
        });

        it("should return an empty list of tasks when board has zero columns", async () => {
            const { user, authHeaders } = await createTestUser();

            const emptyInsert = await Board.collection.insertOne({
                title: "Empty Board Tasks",
                owner: user._id,
                columns: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const boardId = emptyInsert.insertedId;

            const res = await request(app)
                .get(`/api/v1/boards/${boardId}/tasks`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });

        it("should filter tasks by columnKey", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            await createTestTask(board._id, { title: "Todo Task", columnKey: "todo", order: 0 });
            await createTestTask(board._id, { title: "In Progress Task", columnKey: "in-progress", order: 0 });
            await createTestTask(board._id, { title: "Done Task", columnKey: "done", order: 0 });

            const resTodo = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks?columnKey=todo`)
                .set(authHeaders);

            expect(resTodo.status).toBe(200);
            expect(resTodo.body.data).toHaveLength(1);
            expect(resTodo.body.data[0].title).toBe("Todo Task");

            const resProgress = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks?columnKey=in-progress`)
                .set(authHeaders);

            expect(resProgress.status).toBe(200);
            expect(resProgress.body.data).toHaveLength(1);
            expect(resProgress.body.data[0].title).toBe("In Progress Task");
        });

        it("should reject listing tasks for another user's board with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks`)
                .set(user2.authHeaders);

            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/v1/boards/:boardId/tasks/:taskId", () => {
        it("should retrieve a single task by ID", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id, { title: "Specific Task" });

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data._id.toString()).toBe(task._id.toString());
            expect(res.body.data.title).toBe("Specific Task");
        });

        it("should return 404 when taskId does not belong to the given boardId (task-to-board mismatch)", async () => {
            const { user, authHeaders } = await createTestUser();
            const board1 = await createTestBoard(user._id, { title: "Board 1" });
            const board2 = await createTestBoard(user._id, { title: "Board 2" });
            const task = await createTestTask(board1._id, { title: "Task in Board 1" });

            // Query using Board 2's id with task from Board 1
            const res = await request(app)
                .get(`/api/v1/boards/${board2._id}/tasks/${task._id}`)
                .set(authHeaders);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("should return 400 for invalid task ID format", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const res = await request(app)
                .get(`/api/v1/boards/${board._id}/tasks/invalid-task-id`)
                .set(authHeaders);

            expect(res.status).toBe(400);
        });
    });

    describe("PATCH /api/v1/boards/:boardId/tasks/:taskId", () => {
        it("should update task details without affecting columnKey or order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id, {
                title: "Old Title",
                description: "Old Desc",
                priority: "low",
                columnKey: "todo",
                order: 0
            });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(authHeaders)
                .send({
                    title: "Updated Task Title",
                    description: "Updated Description",
                    priority: "high"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe("Updated Task Title");
            expect(res.body.data.description).toBe("Updated Description");
            expect(res.body.data.priority).toBe("high");
            expect(res.body.data.columnKey).toBe("todo");
            expect(res.body.data.order).toBe(0);
        });

        it("should reject updating task with invalid priority or invalid fields", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id, { title: "Test Task" });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(authHeaders)
                .send({
                    priority: "urgent" // invalid priority
                });

            expect(res.status).toBe(400);
        });

        it("should mark a task completed without changing its column or order", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id, {
                title: "Incomplete Task",
                columnKey: "todo",
                order: 0
            });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(authHeaders)
                .send({
                    isCompleted: true
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isCompleted).toBe(true);
            expect(res.body.data.columnKey).toBe("todo"); // Column unaffected
            expect(res.body.data.order).toBe(0); // Order unaffected
        });

        it("should mark a completed task back to incomplete", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id, {
                title: "Completed Task",
                columnKey: "todo"
            });
            task.isCompleted = true;
            await task.save();

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(authHeaders)
                .send({
                    isCompleted: false
                });

            expect(res.status).toBe(200);
            expect(res.body.data.isCompleted).toBe(false);
        });
    });

    describe("PATCH /api/v1/boards/:boardId/tasks/:taskId/move", () => {
        it("should move a task to another column and append by default", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const task1 = await createTestTask(board._id, { title: "Task 1", columnKey: "todo", order: 0 });
            await createTestTask(board._id, { title: "Existing Progress", columnKey: "in-progress", order: 0 });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task1._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "in-progress"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.columnKey).toBe("in-progress");
            expect(res.body.data.order).toBe(1); // Appended after existing task (order 0)
        });

        it("should preserve isCompleted status when moving a completed task across columns", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const task = await createTestTask(board._id, {
                title: "Completed Task",
                columnKey: "todo"
            });
            task.isCompleted = true;
            await task.save();

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "in-progress"
                });

            expect(res.status).toBe(200);
            expect(res.body.data.columnKey).toBe("in-progress");
            expect(res.body.data.isCompleted).toBe(true); // Must remain true!
        });

        it("should not automatically mark a task completed when moved into 'done' column", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const task = await createTestTask(board._id, {
                title: "Task moving to done",
                columnKey: "todo"
            });
            expect(task.isCompleted).toBe(false);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "done"
                });

            expect(res.status).toBe(200);
            expect(res.body.data.columnKey).toBe("done");
            expect(res.body.data.isCompleted).toBe(false); // Independent completion!
        });

        it("should support moving a task into a dynamically added board column", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            // Add dynamic column "In Review" -> key: "in-review"
            await request(app)
                .post(`/api/v1/boards/${board._id}/columns`)
                .set(authHeaders)
                .send({ name: "In Review" });

            const task = await createTestTask(board._id, {
                title: "Task for Review",
                columnKey: "todo"
            });

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "in-review"
                });

            expect(res.status).toBe(200);
            expect(res.body.data.columnKey).toBe("in-review");
        });

        it("should reorder a task within a column at a specific position", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const t0 = await createTestTask(board._id, { title: "Task 0", columnKey: "todo", order: 0 });
            const t1 = await createTestTask(board._id, { title: "Task 1", columnKey: "todo", order: 1 });
            const t2 = await createTestTask(board._id, { title: "Task 2", columnKey: "todo", order: 2 });

            // Move t2 to index 0
            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${t2._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "todo",
                    order: 0
                });

            expect(res.status).toBe(200);
            expect(res.body.data.order).toBe(0);

            // Verify normalized orders in database
            const updatedT0 = await Task.findById(t0._id);
            const updatedT1 = await Task.findById(t1._id);
            expect(updatedT0.order).toBe(1);
            expect(updatedT1.order).toBe(2);
        });

        it("should reject moving task with invalid columnKey", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);
            const task = await createTestTask(board._id);

            const res = await request(app)
                .patch(`/api/v1/boards/${board._id}/tasks/${task._id}/move`)
                .set(authHeaders)
                .send({
                    columnKey: "archive"
                });

            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /api/v1/boards/:boardId/tasks/:taskId", () => {
        it("should delete a task and re-index remaining tasks in the column", async () => {
            const { user, authHeaders } = await createTestUser();
            const board = await createTestBoard(user._id);

            const t0 = await createTestTask(board._id, { title: "Task 0", columnKey: "todo", order: 0 });
            const t1 = await createTestTask(board._id, { title: "Task 1", columnKey: "todo", order: 1 });
            const t2 = await createTestTask(board._id, { title: "Task 2", columnKey: "todo", order: 2 });

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/tasks/${t1._id}`)
                .set(authHeaders);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // t1 should be deleted
            const deletedT1 = await Task.findById(t1._id);
            expect(deletedT1).toBeNull();

            // t0 stays at 0, t2 shifted from 2 down to 1
            const updatedT0 = await Task.findById(t0._id);
            const updatedT2 = await Task.findById(t2._id);
            expect(updatedT0.order).toBe(0);
            expect(updatedT2.order).toBe(1);
        });

        it("should reject deleting another user's task with 404", async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const board = await createTestBoard(user1.user._id);
            const task = await createTestTask(board._id);

            const res = await request(app)
                .delete(`/api/v1/boards/${board._id}/tasks/${task._id}`)
                .set(user2.authHeaders);

            expect(res.status).toBe(404);

            // Verify task still exists
            const taskInDb = await Task.findById(task._id);
            expect(taskInDb).not.toBeNull();
        });
    });
});
