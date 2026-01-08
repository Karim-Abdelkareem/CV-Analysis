import asyncHandler from "express-async-handler";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";
import CVUploadJob from "./cv-upload-job.model.js";
import { addCVUploadJob } from "./upload.queue.js";
import { getVectorStore } from "../vector/chroma.client.js";

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file provided", 400);
  }

  // Get userId from req.user
  const userId = req.user?._id;
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;
  const fileBuffer = req.file.buffer;

  // Determine file type
  let fileType;
  if (mimeType === "application/pdf") {
    fileType = "pdf";
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    fileType = mimeType.includes("openxml") ? "docx" : "doc";
  } else {
    throw new AppError(`Unsupported file type: ${mimeType}`, 400);
  }

  // Save current document data before deleting (to return in response)
  const currentDocumentData =
    user.document && user.document.fileName
      ? {
          fileName: user.document.fileName,
          fileType: user.document.fileType,
          uploadedAt: user.document.uploadedAt,
          atsScore: user.document.atsScore,
          personalInformation: user.document.personalInformation,
          technicalSkills: user.document.technicalSkills,
          yearsOfExperience: user.document.yearsOfExperience,
          education: user.document.education,
        }
      : null;

  // Delete old CV if exists (user can only have one CV)
  if (
    user.document &&
    user.document.chunksIds &&
    user.document.chunksIds.length > 0
  ) {
    try {
      // Delete old chunks from vector store
      const vectorStore = await getVectorStore();
      await vectorStore.delete({ ids: user.document.chunksIds });
    } catch (error) {
      console.error("Error deleting old document chunks:", error);
      // Continue even if deletion fails
    }

    // Clear old document from user
    await user.clearDocument();
  }

  // Cancel/delete any pending or processing jobs for this user
  await CVUploadJob.updateMany(
    {
      userId,
      status: { $in: ["pending", "processing"] },
    },
    {
      status: "cancelled",
      error: {
        message: "Cancelled due to new CV upload",
      },
      completedAt: new Date(),
    }
  );

  // Create job record in MongoDB first (Single Source of Truth)
  const job = await CVUploadJob.create({
    userId,
    status: "pending",
    progress: 0,
    fileInfo: {
      fileName,
      fileType,
      mimeType,
      fileSize: fileBuffer.length,
    },
    fileBuffer,
  });

  // Add job ID to BullMQ queue for processing
  await addCVUploadJob(job._id, userId);

  res.json({
    status: "success",
    message: "CV upload job created. Processing will start shortly.",
    data: {
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      // Return previous document data (will be updated when new job completes)
      document: currentDocumentData,
    },
  });
});

export const getJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user?._id;

  // Read status from MongoDB (Single Source of Truth), not BullMQ
  const job = await CVUploadJob.findOne({
    _id: jobId,
    userId,
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  res.json({
    status: "success",
    data: {
      jobId: job._id.toString(),
      status: job.status,
      progress: job.progress,
      fileInfo: {
        fileName: job.fileInfo.fileName,
        fileType: job.fileInfo.fileType,
      },
      result: job.result || undefined,
      error: job.error || undefined,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
});

/**
 * Get current user's CV document data
 * GET /upload-pdf/document
 */
export const getCurrentDocument = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const user = await User.findById(userId).select("document");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check if user has a document
  if (!user.document || !user.document.fileName) {
    return res.json({
      status: "success",
      data: {
        document: null,
        message: "No CV uploaded yet",
      },
    });
  }

  // Return document data from MongoDB (Single Source of Truth)
  res.json({
    status: "success",
    data: {
      document: {
        fileName: user.document.fileName,
        fileType: user.document.fileType,
        uploadedAt: user.document.uploadedAt,
        totalChunks: user.document.totalChunks,
        atsScore: user.document.atsScore,
        personalInformation: user.document.personalInformation,
        technicalSkills: user.document.technicalSkills,
        yearsOfExperience: user.document.yearsOfExperience,
        education: user.document.education,
      },
    },
  });
});

export const uploadPDF = uploadDocument;
