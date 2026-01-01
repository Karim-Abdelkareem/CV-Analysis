import { Router } from "express";
import {
  generateQuestions,
  getUserSessions,
  getSessionById,
  deleteSession,
} from "./interview.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();

// Question generation route
router.post("/", protect, generateQuestions);

// Session management routes
router.get("/sessions", protect, getUserSessions);
router.get("/sessions/:sessionId", protect, getSessionById);
router.delete("/sessions/:sessionId", protect, deleteSession);

export default router;

