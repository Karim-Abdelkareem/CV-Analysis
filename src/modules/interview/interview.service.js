import { ChatOpenAI } from "@langchain/openai";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";

const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.7,
});

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
