import "dotenv/config";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log("[SERVER] Server Successfully Running :: Port", PORT);
        });
    })
    .catch((err) => {
        console.error("[SERVER] Server Failed Running ::", err.message || err);
        process.exit(1);
    });