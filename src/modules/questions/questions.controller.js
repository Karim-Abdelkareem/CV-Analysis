import asyncHandler from "express-async-handler";
import { generateInterviewQuestions } from "./questions.service.js";
import { AppError } from "../../utils/AppError.js";

/**
 * Generate interview questions for authenticated user
 * POST /api/v1/interview/questions
 */
export const generateQuestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const result = await generateInterviewQuestions(userId);

  res.status(200).json({
    status: "success",
    data: {
      questions: result.questions,
      total: result.total,
      distribution: result.distribution,
    },
  });
});

