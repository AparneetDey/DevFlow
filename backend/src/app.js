import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { notFoundHandler } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

// API routes imports
import authRouter from "./routes/auth.routes.js";
import boardRouter from "./routes/board.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigin = [
    process.env.DEV_URL || "http://localhost:5173"
];

app.use(
    cors({
        origin: allowedOrigin,
        credentials: true
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(cookieParser());

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/boards", boardRouter);

// 404 handler for unmatched routes (registered after all routes)
app.use(notFoundHandler);

// Centralized error handler (registered last)
app.use(errorHandler);

export { app };
