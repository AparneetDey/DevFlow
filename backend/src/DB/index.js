import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


export const connectDB = async () => {
    const client = `${process.env.MONGO_DB_URI}/${DB_NAME}`;
    try {
        const connectionInstance = await mongoose.connect(client);
        console.log("[DATABASE] MongoDB Connected Successfully :: Connected Host ::", connectionInstance.connections[0].host);
    } catch (error) {
        console.log("[DATABASE] MongoDB Connection Failed ::", error);
        process.exit(1);
    }
}