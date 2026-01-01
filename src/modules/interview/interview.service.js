import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";
import InterviewSession from "./interview-session.model.js";

const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.7,
});

// Store active interview sessions in memory for quick access
// Map<sessionId, { chatModel, messageHistory, session }>
const activeSessions = new Map();

/**
 * Generate interview questions based on user's technical skills
 */
export async function generateInterviewQuestions(userId) {
  try {
    // Fetch user with technical skills
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if user has technical skills
    const technicalSkills = user.document?.technicalSkills || [];
    if (!technicalSkills || technicalSkills.length === 0) {
      throw new AppError(
        "No technical skills found. Please upload your CV first.",
        400
      );
    }

    const yearsOfExperience = user.document?.yearsOfExperience || null;

    // Construct prompt for OpenAI
    const skillsList = technicalSkills.join(", ");
    const experienceContext = yearsOfExperience
      ? `The candidate has ${yearsOfExperience} years of professional experience.`
      : "";

    const prompt = `You are an expert interview question generator. Generate personalized interview questions based on the following candidate profile:

Technical Skills: ${skillsList}
${experienceContext}

Generate a balanced mix of interview questions (equal distribution across all three types). Return exactly 15 questions total: 5 technical, 5 behavioral, and 5 situational questions.

For each question, provide:
- A clear, specific question
- Category (technical, behavioral, or situational)
- Difficulty level (beginner, intermediate, or advanced)
- 3-5 helpful tips for answering the question

Return your response as a valid JSON array in this exact format:
[
  {
    "question": "string",
    "category": "technical" | "behavioral" | "situational",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "tips": ["tip1", "tip2", "tip3"]
  }
]

Guidelines:
- Technical questions should be specific to the candidate's skills (${skillsList})
- Behavioral questions should assess soft skills and work experience
- Situational questions should present realistic work scenarios
- Difficulty should match the candidate's experience level
- Tips should be actionable and specific
- Ensure questions are relevant to the candidate's technical background

Return ONLY valid JSON, no additional text or markdown formatting.`;

    // Get response from OpenAI
    const response = await openai.invoke(prompt);
    const responseText = response.content.trim();

    // Parse JSON response
    let questions;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(responseText);
      }
    } catch (parseError) {
      throw new AppError("Failed to parse interview questions response", 500);
    }

    // Validate questions structure
    if (!Array.isArray(questions)) {
      throw new AppError("Invalid response format: expected array", 500);
    }

    // Validate each question has required fields
    const validatedQuestions = questions
      .filter((q) => {
        return (
          q.question &&
          q.category &&
          q.difficulty &&
          Array.isArray(q.tips) &&
          ["technical", "behavioral", "situational"].includes(q.category) &&
          ["beginner", "intermediate", "advanced"].includes(q.difficulty)
        );
      })
      .map((q) => ({
        question: String(q.question).trim(),
        category: q.category,
        difficulty: q.difficulty,
        tips: q.tips
          .map((tip) => String(tip).trim())
          .filter((tip) => tip.length > 0),
      }));

    if (validatedQuestions.length === 0) {
      throw new AppError("No valid questions generated", 500);
    }

    return validatedQuestions;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to generate interview questions", 500);
  }
}

/**
 * Initialize a new interview session
 */
export async function initializeInterviewSession(userId) {
  try {
    // Fetch user with CV data
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if user has technical skills
    const technicalSkills = user.document?.technicalSkills || [];
    if (!technicalSkills || technicalSkills.length === 0) {
      throw new AppError(
        "No technical skills found. Please upload your CV first.",
        400
      );
    }

    const yearsOfExperience = user.document?.yearsOfExperience || null;
    const personalInformation = user.document?.personalInformation || {};

    // Create interview session in database
    const session = await InterviewSession.create({
      userId,
      status: "active",
      metadata: {
        technicalSkills,
        yearsOfExperience,
        personalInformation: {
          fullName: personalInformation.fullName || null,
          email: personalInformation.email || null,
        },
      },
    });

    // Create system prompt with user's CV context
    const skillsList = technicalSkills.join(", ");
    const experienceContext = yearsOfExperience
      ? `The candidate has ${yearsOfExperience} years of professional experience.`
      : "";

    const systemPrompt = `You are a professional and friendly technical interviewer conducting a live interview session. Your role is to:

1. Ask thoughtful, relevant questions based on the candidate's background
2. Engage in natural, conversational dialogue
3. Ask follow-up questions based on the candidate's responses
4. Provide a supportive and professional interview experience
5. Cover technical skills, behavioral questions, and situational scenarios

Candidate Profile:
- Technical Skills: ${skillsList}
${experienceContext}
- Name: ${personalInformation.fullName || "Candidate"}

Guidelines:
- Start with a warm greeting and brief introduction
- Ask one question at a time
- Listen carefully to responses and ask relevant follow-ups
- Mix technical, behavioral, and situational questions naturally
- Keep questions appropriate for the candidate's experience level
- Be encouraging and professional throughout
- If the candidate seems stuck, offer gentle guidance

Begin the interview with a friendly greeting and your first question.`;

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new AppError("OpenAI API key is not configured", 500);
    }

    // Create ChatOpenAI instance with streaming enabled
    const chatModel = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.7,
      streaming: true,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize message history as array
    const messageHistory = [new SystemMessage(systemPrompt)];

    // Store in active sessions
    activeSessions.set(session._id.toString(), {
      chatModel,
      messageHistory,
      session,
    });

    return session;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to initialize interview session", 500);
  }
}

/**
 * Get interview AI instance and message history for a session
 */
export function getInterviewAI(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  if (!sessionData) {
    throw new AppError("Interview session not found or expired", 404);
  }
  return sessionData;
}

/**
 * Stream interview response for user message
 */
export async function streamInterviewResponse(sessionId, userMessage) {
  try {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:252",
        message: "streamInterviewResponse entry",
        data: {
          sessionId,
          userMessage,
          userMessageLength: userMessage?.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    const sessionData = getInterviewAI(sessionId);
    const { chatModel, messageHistory, session } = sessionData;

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:255",
        message: "session data retrieved",
        data: {
          sessionId,
          messageHistoryLength: messageHistory?.length,
          lastMessageRole:
            messageHistory[messageHistory.length - 1]?.constructor?.name,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    if (!userMessage || userMessage.trim().length === 0) {
      throw new AppError("Message cannot be empty", 400);
    }

    // Add user message to history
    messageHistory.push(new HumanMessage(userMessage));
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:262",
        message: "user message added to history",
        data: {
          sessionId,
          messageHistoryLength: messageHistory.length,
          userMessage,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    // Update session transcript in database
    session.transcript.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });
    await session.save();

    // Stream response using message history
    // LangChain stream expects an array of messages
    let fullResponse = "";
    const tokens = [];

    try {
      const stream = await chatModel.stream(messageHistory);

      for await (const chunk of stream) {
        // Handle different chunk formats
        let content = "";

        if (typeof chunk === "string") {
          content = chunk;
        } else if (chunk.content) {
          content = chunk.content;
        } else if (chunk.text) {
          content = chunk.text;
        } else if (
          typeof chunk === "object" &&
          chunk.constructor?.name === "AIMessageChunk"
        ) {
          content = chunk.content || "";
        }

        if (content) {
          fullResponse += content;
          tokens.push(content);
        }
      }
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      console.error("Error details:", {
        message: streamError.message,
        stack: streamError.stack,
        name: streamError.name,
      });

      // If streaming fails, try non-streaming as fallback
      console.log("Attempting fallback to non-streaming response...");
      const response = await chatModel.invoke(messageHistory);
      fullResponse = response.content || response.text || String(response);
      tokens.push(fullResponse);
    }

    // Validate we got a response
    if (!fullResponse || fullResponse.trim().length === 0) {
      throw new AppError("Received empty response from AI", 500);
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:318",
        message: "AI response received",
        data: {
          sessionId,
          fullResponseLength: fullResponse.length,
          containsQuestion: fullResponse.includes("?"),
          questionCount: (fullResponse.match(/\?/g) || []).length,
          fullResponsePreview: fullResponse.substring(0, 150),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    // Add AI response to history
    messageHistory.push(new AIMessage(fullResponse));
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:323",
        message: "AI response added to history",
        data: {
          sessionId,
          messageHistoryLength: messageHistory.length,
          conversationTurnCount: Math.floor((messageHistory.length - 1) / 2),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    // Update session transcript
    session.transcript.push({
      role: "assistant",
      content: fullResponse,
      timestamp: new Date(),
    });
    await session.save();
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "interview.service.js:331",
        message: "session transcript updated",
        data: { sessionId, transcriptLength: session.transcript.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    return {
      tokens,
      fullResponse,
    };
  } catch (error) {
    console.error("Error in streamInterviewResponse:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sessionId,
    });

    if (error instanceof AppError) {
      throw error;
    }

    // Provide more specific error messages
    if (error.message?.includes("API key")) {
      throw new AppError("OpenAI API key is invalid or missing", 500);
    }

    if (error.message?.includes("rate limit")) {
      throw new AppError(
        "OpenAI API rate limit exceeded. Please try again later.",
        429
      );
    }

    throw new AppError(
      `Failed to process interview response: ${
        error.message || "Unknown error"
      }`,
      500
    );
  }
}

/**
 * Finalize interview session
 */
export async function finalizeInterviewSession(sessionId) {
  try {
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Interview session not found", 404);
    }

    const { session } = sessionData;

    // Update session status
    session.status = "completed";
    session.endedAt = new Date();

    // Generate summary using GPT-4o (non-streaming for summary)
    const summaryModel = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.5,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcriptText = session.transcript
      .map(
        (msg) =>
          `${msg.role === "user" ? "Candidate" : "Interviewer"}: ${msg.content}`
      )
      .join("\n\n");

    const summaryPrompt = `Summarize the following interview transcript in 2-3 sentences. Focus on key topics discussed and overall interview flow:

${transcriptText}

Summary:`;

    try {
      const summaryResponse = await summaryModel.invoke(summaryPrompt);
      session.summary = summaryResponse.content.trim();
    } catch (summaryError) {
      // If summary generation fails, continue without summary
      console.error("Failed to generate interview summary:", summaryError);
    }

    await session.save();

    // Remove from active sessions
    activeSessions.delete(sessionId);

    return session;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to finalize interview session", 500);
  }
}

/**
 * Cancel/cleanup interview session (on disconnect or error)
 */
export async function cancelInterviewSession(sessionId) {
  try {
    const sessionData = activeSessions.get(sessionId);
    if (sessionData) {
      const { session } = sessionData;
      session.status = "cancelled";
      session.endedAt = new Date();
      await session.save();
      activeSessions.delete(sessionId);
    }
  } catch (error) {
    console.error("Error cancelling interview session:", error);
  }
}
