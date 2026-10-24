import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigin = [
    process.env.DEV_URL
]

app.use(
    cors({
        origin: allowedOrigin,
        credentials: true
    })
)

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

export { app };