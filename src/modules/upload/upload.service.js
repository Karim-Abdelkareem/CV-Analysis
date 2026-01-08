import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "../vector/chroma.client.js";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";
import { analyzeCV } from "../cv-analysis/cv-analysis.service.js";

// Delete old document chunks from Pinecone
async function deleteUserDocument(userId, chunkIds) {
  if (!chunkIds || chunkIds.length === 0) return;

  try {
    const vectorStore = await getVectorStore();
    await vectorStore.delete({ ids: chunkIds });
  } catch (error) {
    // Don't throw - continue with upload even if deletion fails
  }
}

// Generic function to process any document buffer
async function processDocumentBuffer(fileBuffer, fileType, userId, fileName) {
  let loader;
  const mimeType =
    fileType === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const blob = new Blob([fileBuffer], { type: mimeType });

  // Choose loader based on file type
  if (fileType === "pdf") {
    loader = new PDFLoader(blob);
  } else if (fileType === "docx" || fileType === "doc") {
    loader = new DocxLoader(blob, { type: fileType });
  } else {
    throw new AppError(`Unsupported file type: ${fileType}`, 400);
  }

  // Load document content
  const docs = await loader.load();

  // Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  const chunks = await splitter.splitDocuments(docs);

  // Get user to check for existing document
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Delete old document if exists
  if (user.document && user.document.chunksIds.length > 0) {
    await deleteUserDocument(userId, user.document.chunksIds);
  }

  // Store in Pinecone with user-specific IDs and metadata
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

  const storedIds = await vectorStore.addDocuments(chunksWithMetadata, { ids });

  // Update user document info
  await user.updateDocument(storedIds, fileName, fileType);

  let cvAnalysis = null;
  try {
    cvAnalysis = await analyzeCV(fileBuffer, fileType);

    // Update user with all CV analysis data
    user.document.atsScore = cvAnalysis.atsScore;
    user.document.personalInformation = cvAnalysis.personalInformation;

    // Ensure technicalSkills is always an array of strings
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
  } catch (error) {
    // Don't fail the upload if analysis fails
  }

  return {
    stored: chunks.length,
    ids: storedIds,
    fileType,
    fileName,
    atsScore: cvAnalysis?.atsScore,
    personalInformation: cvAnalysis?.personalInformation,
    technicalSkills: cvAnalysis?.technicalSkills,
    yearsOfExperience: cvAnalysis?.yearsOfExperience,
    education: cvAnalysis?.education,
  };
}

// Generic function that auto-detects file type
export async function processDocument(fileBuffer, mimeType, userId, fileName) {
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

  return await processDocumentBuffer(fileBuffer, fileType, userId, fileName);
}
