import dotenv from "dotenv"
import { connectDB } from "./DB/index.js"
import { app } from "./app.js"

dotenv.config(
    {
         path: './.env' 
    }
)

const PORT = process.env.PORT

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log("[SERVER] Server Successfully Running :: Port", PORT)
    })
})
.catch((err) => {
    console.log("[SERVER] Server Failed Running ::", err);
})