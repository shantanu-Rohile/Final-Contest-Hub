import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import signupRouter from "./Routes/signupRoutes.js";
import loginRouter from "./Routes/loginRoutes.js";
import roomRouter from "./Routes/roomRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

// CORS: set CLIENT_ORIGIN in Vercel/hosting env vars (e.g. https://your-frontend.vercel.app)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || true;
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// ---- Mongo connection (cached across invocations when possible) ----
const MONGOURL = process.env.MONGOURL;

let cachedPromise = global._contestHubMongoPromise;

function connectDB() {
  if (!MONGOURL) {
    return Promise.reject(new Error("MONGOURL is not set"));
  }
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGOURL);
    global._contestHubMongoPromise = cachedPromise;
  }
  return cachedPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    console.error("DB connection error:", e);
    next(e);
  }
});

// ---- Routes ----
app.use("/signup", signupRouter);
app.use("/login", loginRouter);
app.use("/room", roomRouter);

// Healthcheck
app.get("/", (_req, res) => res.json({ ok: true }));

// Basic error handler
app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err?.message || "Server error" });
});

export default app;
