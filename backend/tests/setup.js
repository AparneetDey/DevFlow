import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { beforeAll, afterAll } from "vitest";
import { DB_NAME as PROD_DEV_DB_NAME } from "../src/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const TEST_DB_NAME = process.env.TEST_DB_NAME || "devflow_test";

beforeAll(async () => {
    // 1. Validate that MONGO_DB_URI is present
    if (!process.env.MONGO_DB_URI) {
        throw new Error(
            "TEST ABORTED: MONGO_DB_URI environment variable is missing. Cannot connect to MongoDB test database safely."
        );
    }

    // 2. Safety guard: ensure the database name is strictly a test database
    if (
        !TEST_DB_NAME ||
        TEST_DB_NAME === PROD_DEV_DB_NAME ||
        TEST_DB_NAME === "devflow" ||
        TEST_DB_NAME === "production"
    ) {
        throw new Error(
            `TEST ABORTED: Insecure test database name "${TEST_DB_NAME}". ` +
            `Must use a dedicated test database (e.g. "devflow_test") distinct from "${PROD_DEV_DB_NAME}".`
        );
    }

    // 3. Connect to MongoDB dedicated test database
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_DB_URI, {
            dbName: TEST_DB_NAME
        });
    }

    // 4. Validate connected database name
    if (mongoose.connection.name !== TEST_DB_NAME) {
        throw new Error(
            `TEST ABORTED: Active connection database "${mongoose.connection.name}" does not match expected test database "${TEST_DB_NAME}".`
        );
    }
}, 30000);

afterAll(async () => {
    // Clean up test collections and disconnect
    if (mongoose.connection.readyState !== 0 && mongoose.connection.name === TEST_DB_NAME) {
        try {
            const collections = mongoose.connection.collections;
            for (const key in collections) {
                await collections[key].deleteMany({});
            }
        } catch (err) {
            console.error("Error during test database teardown:", err);
        } finally {
            await mongoose.disconnect();
        }
    }
}, 30000);
