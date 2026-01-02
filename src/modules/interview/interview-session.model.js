import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    transcript: {
      type: [messageSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    interviewType: {
      type: String,
      enum: ["text", "voice"],
      default: "text",
    },
    voiceGender: {
      type: String,
      enum: ["male", "female", "neutral"],
    },
    metadata: {
      technicalSkills: [String],
      yearsOfExperience: Number,
      personalInformation: {
        fullName: String,
        email: String,
      },
    },
    summary: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ status: 1 });

const InterviewSession = mongoose.model(
  "InterviewSession",
  interviewSessionSchema
);

export default InterviewSession;

