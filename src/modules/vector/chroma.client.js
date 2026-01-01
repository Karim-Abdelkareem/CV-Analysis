import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone_api_key,
});

// Get the index
const index = pinecone.Index(config.pinecone_index_name);

// Create embeddings function
const embeddings = new OpenAIEmbeddings({
  apiKey: config.openai_key,
});

// Get or create the vector store
export async function getVectorStore() {
  try {
    if (!config.pinecone_api_key) {
      throw new AppError("Pinecone API key is not configured", 500);
    }
    if (!config.openai_key) {
      throw new AppError("OpenAI API key is not configured", 500);
    }

    return await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to connect to vector store: ${error.message}`,
      500
    );
  }
}
