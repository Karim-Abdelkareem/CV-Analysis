import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../modules/auth/user.model.js";
import { config } from "./env.js";

/**
 * Authenticate Socket.io connection using JWT
 */
export async function authenticateSocket(socket, next) {
  try {
    // Try to get token from multiple sources
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization &&
      socket.handshake.headers.authorization.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.split(" ")[1]
        : null) ||
      socket.handshake.query?.token;

    console.log("Socket authentication attempt:", {
      hasAuthToken: !!socket.handshake.auth?.token,
      hasHeaderAuth: !!socket.handshake.headers?.authorization,
      hasQueryToken: !!socket.handshake.query?.token,
      hasToken: !!token,
    });

    if (!token) {
      console.error("Socket authentication failed: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt_secret);
      console.log("Token verified for user:", decoded.id);
    } catch (err) {
      console.error("Token verification failed:", err.message);
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      console.error("User not found:", decoded.id);
      return next(new Error("Authentication error: User not found"));
    }

    // Check if user is active
    if (!user.active) {
      console.error("User account deactivated:", decoded.id);
      return next(new Error("Authentication error: User account deactivated"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();

    console.log("Socket authenticated successfully for user:", user.email);
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error: " + error.message));
  }
}

/**
 * Create and configure Socket.io server
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.user.email})`);
    console.log(`Socket ID: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${socket.userId} - ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`⚠️ Socket error for user ${socket.userId}:`, error);
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error(`🔴 Connection error:`, error.message);
    });
  });

  // Handle authentication errors
  io.engine.on("connection_error", (err) => {
    console.error("🔴 Socket.io connection error:", err);
  });

  return io;
}
