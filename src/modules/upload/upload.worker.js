import { Worker } from "bullmq";
import { getRedisConnection } from "../../config/redis.js";
import CVUploadJob from "./cv-upload-job.model.js";
import User from "../auth/user.model.js";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "../vector/chroma.client.js";
import { analyzeCV } from "../cv-analysis/cv-analysis.service.js";
import { AppError } from "../../utils/AppError.js";

// Redis connection configuration (supports Redis Cloud)
const connection = getRedisConnection();

// Delete old document chunks from Pinecone
async function deleteUserDocument(userId, chunkIds) {
  if (!chunkIds || chunkIds.length === 0) return;

  try {
    const vectorStore = await getVectorStore();
    await vectorStore.delete({ ids: chunkIds });
  } catch (error) {
    // Don't throw - continue with upload even if deletion fails
    console.error("Error deleting old document chunks:", error);
  }
}

// Process CV upload job
async function processCVUploadJob(jobData) {
  const { jobId, userId } = jobData;

  // Read job state from MongoDB (Single Source of Truth)
  const job = await CVUploadJob.findById(jobId);
  if (!job) {
    throw new AppError(`Job ${jobId} not found in MongoDB`, 404);
  }

  // Check if job is already completed or failed
  if (job.status === "completed") {
    return;
  }

  if (job.status === "failed") {
    return;
  }

  try {
    // Update job status to processing
    job.status = "processing";
    job.startedAt = new Date();
    job.progress = 10;
    await job.save();

    const fileBuffer = job.fileBuffer;
    const fileType = job.fileInfo.fileType;
    const fileName = job.fileInfo.fileName;

    // Step 1: Load document (20%)
    job.progress = 20;
    await job.save();

    let loader;
    const mimeType =
      fileType === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const blob = new Blob([fileBuffer], { type: mimeType });

    if (fileType === "pdf") {
      loader = new PDFLoader(blob);
    } else if (fileType === "docx" || fileType === "doc") {
      loader = new DocxLoader(blob, { type: fileType });
    } else {
      throw new AppError(`Unsupported file type: ${fileType}`, 400);
    }

    const docs = await loader.load();

    // Step 2: Split into chunks (40%)
    job.progress = 40;
    await job.save();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    const chunks = await splitter.splitDocuments(docs);

    // Step 3: Delete old document if exists (50%)
    job.progress = 50;
    await job.save();

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.document && user.document.chunksIds.length > 0) {
      await deleteUserDocument(userId, user.document.chunksIds);
    }

    // Step 4: Store in Pinecone (70%)
    job.progress = 70;
    await job.save();

    const vectorStore = await getVectorStore();
    const timestamp = Date.now();
    const ids = chunks.map((_, i) => `user_${userId}_${timestamp}_${i}`);

    // Add metadata to each chunk for Pinecone native metadata filtering
    const chunksWithMetadata = chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        userId: userId.toString(),
        docType: "cv",
      },
    }));

    const storedIds = await vectorStore.addDocuments(chunksWithMetadata, {
      ids,
    });

    // Step 5: Analyze CV (85%)
    job.progress = 85;
    await job.save();

    let cvAnalysis = null;
    try {
      cvAnalysis = await analyzeCV(fileBuffer, fileType);
    } catch (error) {
      console.error("CV analysis failed:", error);
      // Continue without analysis
    }

    // Step 6: Update User document (95%)
    job.progress = 95;
    await job.save();

    // Update user document info
    await user.updateDocument(storedIds, fileName, fileType);

    // Update user with CV analysis data if available
    if (cvAnalysis) {
      user.document.atsScore = cvAnalysis.atsScore;
      user.document.personalInformation = cvAnalysis.personalInformation;

      if (Array.isArray(cvAnalysis.technicalSkills)) {
        user.document.technicalSkills = cvAnalysis.technicalSkills
          .filter(
            (skill) =>
              skill !== null && skill !== undefined && typeof skill === "string"
          )
          .map((skill) => String(skill).trim())
          .filter((skill) => skill.length > 0);
      } else {
        user.document.technicalSkills = [];
      }

      user.document.yearsOfExperience = cvAnalysis.yearsOfExperience || null;
      user.document.education = cvAnalysis.education;
      await user.save();
    }

    // Step 7: Complete job (100%)
    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date();
    job.result = {
      stored: chunks.length,
      ids: storedIds,
      atsScore: cvAnalysis?.atsScore,
      personalInformation: cvAnalysis?.personalInformation,
      technicalSkills: cvAnalysis?.technicalSkills,
      yearsOfExperience: cvAnalysis?.yearsOfExperience,
      education: cvAnalysis?.education,
    };
    await job.save();
  } catch (error) {
    // Update job status to failed in MongoDB
    job.status = "failed";
    job.error = {
      message: error.message || "Unknown error",
      stack: error.stack,
    };
    job.completedAt = new Date();
    await job.save();

    console.error(`Job ${jobId} failed:`, error);
    throw error;
  }
}

// Create BullMQ worker
export const cvUploadWorker = new Worker(
  "cv-upload",
  async (job) => {
    const { jobId, userId } = job.data;

    // Process job - all state updates happen in MongoDB
    await processCVUploadJob({ jobId, userId });

    return { jobId, status: "completed" };
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 5, // Max 5 jobs per second
      duration: 1000,
    },
  }
);

// Worker event handlers
cvUploadWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

cvUploadWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);

  // Update job status in MongoDB if job data is available
  if (job?.data?.jobId) {
    CVUploadJob.findByIdAndUpdate(
      job.data.jobId,
      {
        status: "failed",
        error: {
          message: err.message || "Unknown error",
          stack: err.stack,
        },
        completedAt: new Date(),
      },
      { new: true }
    ).catch((error) => {
      console.error("Error updating job status in MongoDB:", error);
    });
  }
});

cvUploadWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

export default cvUploadWorker;
