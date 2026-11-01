import mongoose, { Schema } from "mongoose";

/**
 * Embedded Column subdocument schema for Board columns.
 */
const columnSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Column name is required"],
            trim: true,
            minlength: [1, "Column name cannot be empty"],
            maxlength: [50, "Column name cannot exceed 50 characters"]
        },
        title: {
            type: String,
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

columnSchema.pre("validate", function () {
    if (!this.name && this.title) {
        this.name = this.title;
    }
    if (!this.title && this.name) {
        this.title = this.name;
    }
});

/**
 * Default immutable column definitions for newly created boards.
 */
export const DEFAULT_COLUMNS = Object.freeze([
    { name: "To Do", title: "To Do", key: "todo", order: 0 },
    { name: "In Progress", title: "In Progress", key: "in-progress", order: 1 },
    { name: "Done", title: "Done", key: "done", order: 2 }
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

boardSchema.post("init", function () {
    if (!this.columns || this.columns.length === 0) {
        this.columns = DEFAULT_COLUMNS.map((col) => ({ ...col }));
    } else {
        for (const col of this.columns) {
            if (!col.name && col.title) col.name = col.title;
            if (!col.title && col.name) col.title = col.name;
        }
    }
});

export const Board = mongoose.model("Board", boardSchema);
