import { getVectorStore } from "./chroma.client.js";
import User from "../auth/user.model.js";
import { AppError } from "../../utils/AppError.js";

export async function queryDocuments(query, userId) {
  // Check if user has uploaded CV (validation only)
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.document || user.document.chunksIds.length === 0) {
    throw new AppError(
      "No document uploaded yet. Please upload a document first.",
      404
    );
  }

  const vectorStore = await getVectorStore();

  const userIdStr = userId.toString();

  // Use Pinecone's native metadata filtering with topK
  // No manual filtering needed - Pinecone handles all filtering natively
  const results = await vectorStore.similaritySearch(query, 3, {
    userId: userIdStr,
  });

  if (results.length === 0) {
    throw new AppError("No relevant content found in your document", 404);
  }

  // Format results (already filtered by Pinecone natively)
  return {
    documents: [results.map((r) => r.pageContent)],
    ids: [results.map((r) => r.id || "")],
    metadatas: [results.map((r) => r.metadata || {})],
  };
}
