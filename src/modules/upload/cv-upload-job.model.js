import mongoose from "mongoose";

const cvUploadJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    fileInfo: {
      fileName: {
        type: String,
        required: true,
      },
      fileType: {
        type: String,
        enum: ["pdf", "docx", "doc"],
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
      },
    },
    fileBuffer: {
      type: Buffer,
      required: true,
    },
    result: {
      stored: Number,
      ids: [String],
      atsScore: {
        score: Number,
        feedback: {
          strengths: [String],
          weaknesses: [String],
          recommendations: [String],
        },
        breakdown: {
          formatting: Number,
          keywords: Number,
          contact: Number,
          experience: Number,
          education: Number,
          sections: Number,
          atsCompatibility: Number,
        },
        analyzedAt: Date,
      },
      personalInformation: {
        fullName: String,
        email: String,
        phone: String,
        location: String,
        linkedin: String,
        github: String,
        portfolio: String,
        summary: String,
      },
      technicalSkills: [String],
      yearsOfExperience: Number,
      education: [
        {
          degree: String,
          field: String,
          institution: String,
          location: String,
          startDate: String,
          endDate: String,
          gpa: String,
          honors: String,
        },
      ],
    },
    error: {
      message: String,
      stack: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

// Indexes for efficient queries
cvUploadJobSchema.index({ userId: 1, createdAt: -1 });
cvUploadJobSchema.index({ status: 1, createdAt: -1 });

const CVUploadJob = mongoose.model("CVUploadJob", cvUploadJobSchema);

export default CVUploadJob;

