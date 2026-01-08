import { ChatOpenAI } from "@langchain/openai";
import { AppError } from "../../utils/AppError.js";
import User from "../auth/user.model.js";

const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.7,
});

/**
 * Generate 15 personalized interview questions based on user's skills and experience
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object containing questions array and distribution
 */
export async function generateInterviewQuestions(userId) {
  try {
    // Fetch user with document data
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Validate user has CV uploaded
    if (!user.document || !user.document.fileName) {
      throw new AppError(
        "You must upload your CV before generating interview questions",
        400
      );
    }

    // Extract user profile data
    const technicalSkills = user.document.technicalSkills || [];
    const yearsOfExperience = user.document.yearsOfExperience || 0;
    const personalInfo = user.document.personalInformation || {};
    const education = user.document.education || [];

    // Build user profile context
    const skillsList =
      technicalSkills.length > 0 ? technicalSkills.join(", ") : "Not specified";

    const experienceLevel =
      yearsOfExperience < 2
        ? "junior"
        : yearsOfExperience < 5
        ? "mid"
        : "senior";

    const educationSummary =
      education.length > 0
        ? education
            .map(
              (edu) => `${edu.degree} in ${edu.field} from ${edu.institution}`
            )
            .join("; ")
        : "Not specified";

    // Determine question distribution based on profile
    let distribution;
    if (yearsOfExperience >= 5 && technicalSkills.length >= 5) {
      // Senior/experienced: More technical questions
      distribution = { technical: 7, behavioral: 4, situational: 4 };
    } else if (yearsOfExperience >= 2) {
      // Mid-level: Balanced
      distribution = { technical: 5, behavioral: 5, situational: 5 };
    } else {
      // Junior/entry: More behavioral and situational
      distribution = { technical: 4, behavioral: 6, situational: 5 };
    }

    // Build system prompt
    const systemPrompt = `You are an expert technical interviewer creating personalized interview questions.

Your task is to generate exactly 15 interview questions based on the candidate's profile.

QUESTION TYPES:
1. Technical: Questions about specific technologies, programming concepts, system design, algorithms
2. Behavioral: Questions about past experiences, teamwork, problem-solving, leadership
3. Situational: Hypothetical scenarios and how the candidate would handle them

QUESTION DISTRIBUTION:
- Technical: ${distribution.technical} questions
- Behavioral: ${distribution.behavioral} questions
- Situational: ${distribution.situational} questions

CANDIDATE PROFILE:
- Technical Skills: ${skillsList}
- Years of Experience: ${yearsOfExperience} years
- Experience Level: ${experienceLevel}
- Education: ${educationSummary}
${personalInfo.summary ? `- Summary: ${personalInfo.summary}` : ""}

REQUIREMENTS:
1. Generate exactly 15 questions total
2. Questions must be personalized to the candidate's skills and experience level
3. Technical questions should focus on technologies mentioned in their skills
4. Behavioral questions should be relevant to their experience level
5. Situational questions should be appropriate for their role level
6. Each question should be clear, specific, and interview-appropriate
7. Difficulty should match their experience level (${experienceLevel})

OUTPUT FORMAT:
Return a valid JSON array of question objects. Each object must have:
{
  "type": "technical" | "behavioral" | "situational",
  "question": "The question text",
  "category": "Specific category (e.g., 'JavaScript', 'Teamwork', 'Problem-solving')",
  "difficulty": "junior" | "mid" | "senior",
  "tips": [
    "Tip 1 on how to answer this question effectively",
    "Tip 2 on what to focus on",
    "Tip 3 on what to avoid or include"
  ]
}

IMPORTANT FOR TIPS:
- Provide 2-3 practical tips for each question
- Tips should be specific to the question type and difficulty level
- For technical questions: focus on what concepts to explain, examples to give, depth expected
- For behavioral questions: focus on using STAR method, what experiences to highlight, key points to cover
- For situational questions: focus on problem-solving approach, considerations, what to demonstrate
- Tips should help the candidate prepare a strong, comprehensive answer

Return ONLY the JSON array, no additional text or markdown formatting.`;

    // Call GPT-4o
    const response = await openai.invoke([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate 15 personalized interview questions for this candidate. Return the questions as a JSON array.`,
      },
    ]);

    // Parse response
    let questions;
    try {
      const content = response.content.trim();
      // Remove markdown code blocks if present
      const jsonContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      questions = JSON.parse(jsonContent);
    } catch (parseError) {
      // Try to extract JSON from response if wrapped in text
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new AppError("Failed to parse questions from AI response", 500);
      }
    }

    // Validate questions structure
    if (!Array.isArray(questions) || questions.length !== 15) {
      throw new AppError(
        `Expected 15 questions, but received ${questions.length}`,
        500
      );
    }

    // Validate each question has required fields
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.type || !q.question || !q.category || !q.difficulty || !q.tips) {
        throw new AppError(`Question ${i + 1} is missing required fields`, 500);
      }
      if (!["technical", "behavioral", "situational"].includes(q.type)) {
        throw new AppError(
          `Question ${i + 1} has invalid type: ${q.type}`,
          500
        );
      }
      if (!["junior", "mid", "senior"].includes(q.difficulty)) {
        throw new AppError(
          `Question ${i + 1} has invalid difficulty: ${q.difficulty}`,
          500
        );
      }
      if (!Array.isArray(q.tips) || q.tips.length < 2) {
        throw new AppError(
          `Question ${i + 1} must have at least 2 tips in an array`,
          500
        );
      }
    }

    // Count actual distribution
    const actualDistribution = {
      technical: questions.filter((q) => q.type === "technical").length,
      behavioral: questions.filter((q) => q.type === "behavioral").length,
      situational: questions.filter((q) => q.type === "situational").length,
    };

    return {
      questions,
      total: questions.length,
      distribution: actualDistribution,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to generate interview questions: ${error.message}`,
      500
    );
  }
}
