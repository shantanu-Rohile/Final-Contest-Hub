import express from "express";
import cors from "cors";
import Rooms from "./Models/roomModel.js";
import { createServer } from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import signupRouter from "./Routes/signupRoutes.js";
import loginRouter from "./Routes/loginRoutes.js";
import roomRouter from "./Routes/roomRoutes.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    console.log("CORS origin:", origin);

    if (!origin) return cb(null, true);           // Postman/curl
    if (allowedOrigins.includes(origin)) return cb(null, true);

    return cb(null, false);                      // don't throw
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // path wildcard, NOT origins

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});



const PORT = process.env.PORT || 3000;
const MONGOURL = process.env.MONGOURL;

app.use("/signup", signupRouter);
app.use("/login", loginRouter);
app.use("/room", roomRouter);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.emit("id", socket.id);

  // helper to emit leaderboard
  const emitLeaderboard = (room) => {
    const leaderboard = (room.participants || [])
      .map((p) => ({
        username: p.username || "Anonymous",
        score: p.score || 0,
        completed: !!p.completed,
      }))
      .sort((a, b) => b.score - a.score);
    io.to(room.roomId).emit("leaderboard-data", leaderboard);
  };

  socket.on("Join-Room", async (data) => {
  const roomId = data.id;
  const useId = data.useId;
  const userName = data.username;
  try {
    const room = await Rooms.findOne({ roomId });
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    socket.userId = useId;
    socket.join(roomId);

    // Upsert participant entry so usernames are always available in lobby/leaderboard
    const participant = room.participants.find(
      (p) => p.userId && p.userId.toString() === String(socket.userId)
    );

    if (!participant) {
      room.participants.push({
        userId: socket.userId,
        username: userName,
        socketId: socket.id,
        score: 0,
        answers: [],
        completed: false,
        currentQuestionIndex: room.status === "live" ? 0 : -1,
        currentQuestionStartedAt: room.status === "live" ? new Date() : null,
      });
    } else {
      // If the participant was added earlier without a username, update it
      if (!participant.username && userName) participant.username = userName;
      participant.socketId = socket.id;

      // If contest is live and this participant hasn't been initialized yet, initialize now
      if (room.status === "live" && (participant.currentQuestionIndex === -1 || participant.currentQuestionIndex == null)) {
        participant.currentQuestionIndex = 0;
        participant.currentQuestionStartedAt = new Date();
        participant.completed = false;
      }
    }

    await room.save();

    // Send contest + participant state to the joining user
    const freshParticipant = room.participants.find(
      (p) => p.userId && p.userId.toString() === String(socket.userId)
    );

    socket.emit("sync-state", {
      status: room.status,
      contestStartedAt: room.contestStartedAt,
      participant: {
        currentQuestionIndex: freshParticipant?.currentQuestionIndex ?? -1,
        currentQuestionStartedAt: freshParticipant?.currentQuestionStartedAt ?? null,
        completed: !!freshParticipant?.completed,
        score: freshParticipant?.score ?? 0,
      },
    });

    // Broadcast updated participant list (fix missing names in lobby)
    io.to(roomId).emit(
      "participants-updated",
      room.participants.map((p) => ({
        userId: p.userId,
        username: p.username || "Anonymous",
      }))
    );

    // Ensure leaderboard is available immediately
    emitLeaderboard(room);

    console.log(`User ${socket.userId} joined room ${roomId} as ${userName}`);
  } catch (err) {
    console.error("Join-Room error:", err);
  }
});

  socket.on("start-contest", async (roomId) => {
    const room = await Rooms.findOne({ roomId });
    if (!room || room.host.toString() !== socket.userId) return;

    if (room.status !== "waiting") return;
    if (!room.questions || room.questions.length === 0) {
      socket.emit("error", "No questions uploaded yet");
      return;
    }

    room.status = "live";
    room.contestStartedAt = new Date();

    // Initialize each participant's individual progression
    const now = new Date();
    room.participants.forEach((p) => {
      p.score = 0;
      p.answers = [];
      p.completed = false;
      p.currentQuestionIndex = 0;
      p.currentQuestionStartedAt = now;
    });

    // keep legacy fields in sync for older clients
    room.currentQuestionIndex = 0;
    room.currentQuestionStartedAt = now;
    await room.save();

    io.to(roomId).emit("contest-started", {
      contestStartedAt: room.contestStartedAt,
    });

    // Push each participant their current state
    room.participants.forEach((p) => {
      if (p.socketId) {
        io.to(p.socketId).emit("your-state", {
          currentQuestionIndex: p.currentQuestionIndex,
          currentQuestionStartedAt: p.currentQuestionStartedAt,
          completed: p.completed,
        });
      }
    });

    emitLeaderboard(room);
  });

  // Legacy: host-driven next-question (kept as no-op for compatibility)
  socket.on("next-question", async (roomId) => {
    const room = await Rooms.findOne({ roomId });
    if (!room) return;
    // Contest is now individual-paced; ignore.
  });

  socket.on("submit-answer", async ({ roomId, questionId, selectedOption }) => {
    try {
      const room = await Rooms.findOne({ roomId });
      if (!room || room.status !== "live") return;

      const participant = room.participants.find(
        (p) => p.userId && p.userId.toString() === socket.userId
      );

      if (!participant) return;

      if (participant.completed) return;

      // Ensure participant progression is initialized
      if (participant.currentQuestionIndex == null || participant.currentQuestionIndex < 0) {
        participant.currentQuestionIndex = 0;
        participant.currentQuestionStartedAt = new Date();
      }

      // Validate: submitted question must match participant's current question
      const currentQ = room.questions[participant.currentQuestionIndex];
      if (!currentQ) {
        participant.completed = true;
        await room.save();
        io.to(socket.id).emit("your-state", {
          currentQuestionIndex: participant.currentQuestionIndex,
          currentQuestionStartedAt: participant.currentQuestionStartedAt,
          completed: true,
        });
        emitLeaderboard(room);
        return;
      }

      if (String(currentQ._id) !== String(questionId)) {
        // Ignore out-of-sync submissions
        return;
      }

      const alreadyAnswered = participant.answers.some(
        (a) => a.questionId && a.questionId.toString() === questionId
      );
      if (alreadyAnswered) return;

      const question = room.questions.id(questionId);
      if (!question) return;

      const now = Date.now();
      const startedAt = participant.currentQuestionStartedAt ? new Date(participant.currentQuestionStartedAt).getTime() : now;
      const elapsedSec = Math.max(0, (now - startedAt) / 1000);
      const timeLimit = question.timeLimit || 30;

      const isWithinTime = elapsedSec <= timeLimit;
      const isCorrect = isWithinTime && selectedOption === question.correctOptionIndex;

      participant.answers.push({
        questionId,
        selectedOption: selectedOption ?? null,
        isCorrect,
      });

      if (isCorrect) {
        // Time-based scoring: faster answers get more points.
        // total = marks + bonus where bonus scales down to 0 at timeLimit.
        const remainingRatio = Math.max(0, (timeLimit - elapsedSec) / timeLimit);
        const bonus = Math.floor(question.marks * remainingRatio);
        participant.score += question.marks + bonus;
      }

      // Advance this participant immediately
      participant.currentQuestionIndex += 1;
      participant.currentQuestionStartedAt = new Date();

      if (participant.currentQuestionIndex >= room.questions.length) {
        participant.completed = true;
      }

      // End room when everyone completes
      const allCompleted = room.participants.length > 0 && room.participants.every((p) => p.completed);
      if (allCompleted) {
        room.status = "ended";
      }

      await room.save();

      // Send updated state to just this participant
      io.to(socket.id).emit("your-state", {
        currentQuestionIndex: participant.currentQuestionIndex,
        currentQuestionStartedAt: participant.currentQuestionStartedAt,
        completed: participant.completed,
      });

      emitLeaderboard(room);

      if (room.status === "ended") {
        io.to(roomId).emit("contest-ended");
      }
    } catch (err) {
      console.error("Submit-Answer error:", err);
    }
  });

  // Legacy hook: keep for older clients
  socket.on("contest-completed", async ({ roomId }) => {
    const room = await Rooms.findOne({ roomId });
    if (!room) return;
    emitLeaderboard(room);
  });



  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* 🚀 START SERVER */
mongoose
  .connect(MONGOURL)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });