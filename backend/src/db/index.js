import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_DB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_DB_URI is not defined in environment variables");
        }

        const connectionInstance = await mongoose.connect(mongoUri, {
            dbName: DB_NAME
        });

        console.log("[DATABASE] MongoDB Connected Successfully :: Connected Host ::", connectionInstance.connections[0].host);
        return connectionInstance;
    } catch (error) {
        console.error("[DATABASE] MongoDB Connection Failed ::", error.message || error);
        throw error;
    }
};