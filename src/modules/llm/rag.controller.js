import asyncHandler from "express-async-handler";
import { askQuestion } from "./rag.service.js";
import { AppError } from "../../utils/AppError.js";

export const ask = asyncHandler(async (req, res) => {
  const question = req.body.question || req.body.q;

  if (!question) {
    throw new AppError("Question is required in request body", 400);
  }

  // Get userId from req.user (assuming you'll add auth middleware)
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const answer = await askQuestion(question, userId);
  res.json({
    status: "success",
    data: { answer },
  });
});
