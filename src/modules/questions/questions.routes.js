import { Router } from "express";
import { generateQuestions } from "./questions.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();

// Generate interview questions
router.post("/questions", protect, generateQuestions);

export default router;

