import mongoose, { Schema } from "mongoose";

/**
 * Embedded Column subdocument schema for Board columns.
 */
const columnSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Column title is required"],
            trim: true
        },
        key: {
            type: String,
            required: [true, "Column key is required"],
            trim: true
        },
        order: {
            type: Number,
            required: [true, "Column order is required"]
        }
    },
    { _id: false }
);

/**
 * Default immutable column definitions for newly created boards.
 */
export const DEFAULT_COLUMNS = Object.freeze([
    { title: "Todo", key: "todo", order: 0 },
    { title: "In Progress", key: "in-progress", order: 1 },
    { title: "Done", key: "done", order: 2 }
]);

const boardSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Board title is required"],
            trim: true,
            minlength: [1, "Board title cannot be empty"],
            maxlength: [100, "Board title cannot exceed 100 characters"]
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Board description cannot exceed 500 characters"],
            default: ""
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Board owner is required"],
            index: true
        },
        columns: {
            type: [columnSchema],
            default: () => DEFAULT_COLUMNS.map((col) => ({ ...col }))
        }
    },
    {
        timestamps: true
    }
);

export const Board = mongoose.model("Board", boardSchema);
