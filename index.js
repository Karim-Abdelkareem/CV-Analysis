import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import uploadRoutes from "./src/modules/upload/upload.routes.js";
import vectorRoutes from "./src/modules/vector/vector.routes.js";
import ragRoutes from "./src/modules/llm/rag.routes.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import questionRoutes from "./src/modules/questions/questions.routes.js";

import { globalErrorHandler } from "./src/middleware/errorHandler.middleware.js";
import { AppError } from "./src/utils/AppError.js";
import { connectDB } from "./src/config/db.js";
import { cvUploadWorker } from "./src/modules/upload/upload.worker.js";

const app = express();

/* =======================
   Middlewares
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* =======================
   Routes
======================= */
app.use("/api/v1/auth", authRoutes);
app.use("/upload-pdf", uploadRoutes);
app.use("/query", vectorRoutes);
app.use("/ask", ragRoutes);
app.use("/api/v1/interview", questionRoutes);

/* =======================
   404 Handler
======================= */
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/* =======================
   Global Error Handler
======================= */
app.use(globalErrorHandler);

/* =======================
   DB Connection
======================= */
connectDB();

/* =======================
   HTTP Server
======================= */
const server = http.createServer(app);

/* =======================
   Socket.IO
======================= */
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Handle connection errors
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", err);
});

// Register namespaces
// (Interview namespace removed)

/* =======================
   BullMQ Worker
======================= */
console.log("CV Upload Worker initialized");

cvUploadWorker.on("error", (error) => {
  console.error("CV Upload Worker error:", error);
});

/* =======================
   Start Server
======================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CV Upload Worker is ready to process jobs`);
});
