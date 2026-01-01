import asyncHandler from "express-async-handler";
import { queryDocuments } from "./vector.service.js";
import { AppError } from "../../utils/AppError.js";

export const queryVector = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    throw new AppError("Query parameter 'q' is required", 400);
  }

  // Get userId from req.user (assuming you'll add auth middleware)
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const result = await queryDocuments(q, userId);
  res.json({
    status: "success",
    data: result,
  });
});
