import { getVectorStore } from "./chroma.client.js";
import User from "../auth/user.model.js";
import { AppError } from "../../utils/AppError.js";

export async function queryDocuments(query, userId) {
  // Get user's document IDs
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

  // Perform similarity search with filter for user's document IDs
  // Note: PineconeStore doesn't directly support filtering by IDs in similaritySearch
  // So we'll use a workaround: search all and filter results
  const results = await vectorStore.similaritySearch(query, 100); // Get more results to filter

  // Filter results to only include user's document chunks
  const userResults = results.filter((result) => {
    const resultId = result.id || "";
    return user.document.chunksIds.includes(resultId);
  });

  // Limit to top 3 results
  const topResults = userResults.slice(0, 3);
  if (topResults.length === 0) {
    throw new AppError("No relevant content found in your document", 404);
  }

  // Format results
  return {
    documents: [topResults.map((r) => r.pageContent)],
    ids: [topResults.map((r) => r.metadata?.id || "")],
    metadatas: [topResults.map((r) => r.metadata || {})],
  };
}
