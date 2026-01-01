import asyncHandler from "express-async-handler";
import { processDocument } from "./upload.service.js";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file provided", 400);
  }

  // Get userId from req.user (assuming you'll add auth middleware)
  const userId = req.user?._id;
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;

  const result = await processDocument(
    req.file.buffer,
    mimeType,
    userId,
    fileName
  );

  res.json({
    status: "success",
    message: "Document stored successfully",
    data: result,
  });
});

export const uploadPDF = uploadDocument;
