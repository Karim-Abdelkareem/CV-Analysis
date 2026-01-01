import asyncHandler from "express-async-handler";
import { generateInterviewQuestions } from "./interview.service.js";
import { AppError } from "../../utils/AppError.js";
import InterviewSession from "./interview-session.model.js";

export const generateQuestions = asyncHandler(async (req, res) => {
  // Get userId from req.user (set by auth middleware)
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const questions = await generateInterviewQuestions(userId);

  res.json({
    status: "success",
    data: {
      questions,
    },
  });
});

/**
 * Get all interview sessions for the authenticated user
 */
export const getUserSessions = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const sessions = await InterviewSession.find({ userId })
    .sort({ createdAt: -1 })
    .select("-transcript")
    .lean();

  res.json({
    status: "success",
    results: sessions.length,
    data: {
      sessions,
    },
  });
});

/**
 * Get a specific interview session by ID
 */
export const getSessionById = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const { sessionId } = req.params;

  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  res.json({
    status: "success",
    data: {
      session,
    },
  });
});

/**
 * Delete an interview session
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  const { sessionId } = req.params;

  const session = await InterviewSession.findOneAndDelete({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  res.json({
    status: "success",
    message: "Interview session deleted successfully",
  });
});

