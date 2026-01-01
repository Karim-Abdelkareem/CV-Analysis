import { queryDocuments } from "../vector/vector.service.js";
import { ChatOpenAI } from "@langchain/openai";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";

const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
});

const structuredOpenAI = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o", // or "gpt-4o-mini" if you want to save costs
  temperature: 0,
});

export async function askQuestion(question, userId) {
  if (!question || question.trim().length === 0) {
    throw new AppError("Question cannot be empty", 400);
  }

  const vector = await queryDocuments(question, userId);
  const documents = vector.documents[0] || [];

  if (documents.length === 0) {
    throw new AppError("No relevant documents found for your question", 404);
  }

  const context = documents.join("\n");
  const prompt = `Answer based on context only:\n${context}\nQuestion: ${question}`;

  const response = await openai.invoke(prompt);
  return response.content;
}
