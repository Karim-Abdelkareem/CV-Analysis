import express from "express";
import http from "http";
import uploadRoutes from "./src/modules/upload/upload.routes.js";
import vectorRoutes from "./src/modules/vector/vector.routes.js";
import ragRoutes from "./src/modules/llm/rag.routes.js";
import interviewRoutes from "./src/modules/interview/interview.routes.js";
import livekitRoutes from "./src/modules/interview/livekit.routes.js";
import { globalErrorHandler } from "./src/middleware/errorHandler.middleware.js";
import { AppError } from "./src/utils/AppError.js";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import cors from "cors";
import { createSocketServer } from "./src/config/socket.js";
import { registerInterviewHandlers } from "./src/modules/interview/interview.socket.js";

const corsOptions = {
  origin: "*",
  credentials: true,
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.use("/api/v1/auth", authRoutes);
app.use("/upload-pdf", uploadRoutes);
app.use("/query", vectorRoutes);
app.use("/ask", ragRoutes);
app.use("/api/v1/interview/questions", interviewRoutes);
app.use("/api/v1/interview/livekit", livekitRoutes);

// Handle undefined routes
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

connectDB();

// Create HTTP server from Express app
const server = http.createServer(app);

// Create Socket.io server
const io = createSocketServer(server);

// Register interview socket handlers
io.on("connection", (socket) => {
  registerInterviewHandlers(io, socket);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server Is Running on port ${PORT}`);
  console.log(`Socket.io server is ready for connections`);
  console.log(
    `LiveKit voice interview endpoints available at /api/v1/interview/livekit`
  );
});
