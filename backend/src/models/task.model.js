import mongoose, { Schema } from "mongoose";

export const TASK_COLUMNS = Object.freeze(["todo", "in-progress", "done"]);
export const TASK_PRIORITIES = Object.freeze(["low", "medium", "high"]);

const taskSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
            minlength: [1, "Task title cannot be empty"],
            maxlength: [150, "Task title cannot exceed 150 characters"]
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, "Task description cannot exceed 2000 characters"],
            default: ""
        },
        boardId: {
            type: Schema.Types.ObjectId,
            ref: "Board",
            required: [true, "Board ID is required"],
            index: true
        },
        columnKey: {
            type: String,
            required: [true, "Column key is required"],
            enum: {
                values: TASK_COLUMNS,
                message: "Column key must be one of: todo, in-progress, done"
            },
            default: "todo"
        },
        order: {
            type: Number,
            required: [true, "Order is required"],
            min: [0, "Order must be a non-negative number"],
            default: 0
        },
        priority: {
            type: String,
            enum: {
                values: TASK_PRIORITIES,
                message: "Priority must be one of: low, medium, high"
            },
            default: "medium"
        },
        dueDate: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Compound index for querying tasks by board and column in order
taskSchema.index({ boardId: 1, columnKey: 1, order: 1 });
taskSchema.index({ boardId: 1, order: 1 });

export const Task = mongoose.model("Task", taskSchema);
