import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { ChatOpenAI } from "@langchain/openai";
import { AppError } from "../../utils/AppError.js";

const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  temperature: 0,
});

/**
 * Extract full text from CV document
 */
async function extractCVText(fileBuffer, fileType) {
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
  // Combine all pages/sections into one text
  const fullText = docs.map((doc) => doc.pageContent).join("\n\n");
  return fullText;
}

/**
 * Extract personal information, technical skills, and education from CV
 */
export async function extractCVInformation(fileBuffer, fileType) {
  try {
    // Extract text from CV
    const cvText = await extractCVText(fileBuffer, fileType);

    const extractionPrompt = `You are an expert CV parser. Extract structured information from the following CV.

CV Content:
${cvText}

Extract the following information and return it as valid JSON:

{
  "personalInformation": {
    "fullName": "<full name>",
    "email": "<email address>",
    "phone": "<phone number>",
    "location": "<city, country or address>",
    "linkedin": "<LinkedIn URL if present>",
    "github": "<GitHub URL if present>",
    "portfolio": "<Portfolio/website URL if present>",
    "summary": "<professional summary or objective if present>"
  },
  "technicalSkills": [<array of all technical skills including programming languages, frameworks, databases, tools, cloud platforms, and any other technical skills mentioned>],
  "yearsOfExperience": <number representing total years of professional work experience, calculate from all work experience entries>,
  "education": [
    {
      "degree": "<degree name>",
      "field": "<field of study>",
      "institution": "<university/school name>",
      "location": "<location>",
      "startDate": "<start date>",
      "endDate": "<end date or 'Present' if ongoing>",
      "gpa": "<GPA if mentioned>",
      "honors": "<honors or achievements if any>"
    }
  ]
}

Rules:
- If a field is not found, use null or empty array/string
- For dates, use format: "MM/YYYY" or "YYYY" or "Month YYYY"
- Extract all technical skills mentioned (programming languages, frameworks, databases, tools, cloud platforms, etc.) into a single array
- Calculate yearsOfExperience by summing all professional work experience periods (exclude internships if they are clearly marked as such, but include them if they are substantial professional experience)
- If calculating from dates, use the earliest work start date to the latest work end date (or current date if still working)
- Return yearsOfExperience as a number (can be a decimal like 2.5 for 2 years and 6 months)
- Include all education entries (degrees, certifications, etc.)
- Be accurate and only extract information that is clearly stated

Return ONLY valid JSON, no additional text or markdown formatting.`;

    const response = await openai.invoke(extractionPrompt);
    const responseText = response.content.trim();

    // Parse JSON response
    let extractedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(responseText);
      }
    } catch (parseError) {
      throw new AppError("Failed to parse CV information extraction", 500);
    }

    // Combine all technical skills into a single array if they come in categorized format
    let technicalSkills = [];
    if (extractedData.technicalSkills) {
      let skillsData = extractedData.technicalSkills;

      // If it's a string, try to parse it
      if (typeof skillsData === "string") {
        try {
          skillsData = JSON.parse(skillsData);
        } catch (e) {
          skillsData = null;
        }
      }

      if (skillsData) {
        if (Array.isArray(skillsData)) {
          // Check if it's an array of strings (already flat) or array of objects (categorized)
          if (skillsData.length > 0 && typeof skillsData[0] === "string") {
            // Already a single array of strings
            technicalSkills = skillsData.filter(
              (skill) => typeof skill === "string"
            );
          } else if (
            skillsData.length > 0 &&
            typeof skillsData[0] === "object"
          ) {
            // Array containing categorized object(s) - extract from first object
            const skillsObj = skillsData[0];
            technicalSkills = [
              ...(Array.isArray(skillsObj.programmingLanguages)
                ? skillsObj.programmingLanguages
                : []),
              ...(Array.isArray(skillsObj.frameworks)
                ? skillsObj.frameworks
                : []),
              ...(Array.isArray(skillsObj.databases)
                ? skillsObj.databases
                : []),
              ...(Array.isArray(skillsObj.tools) ? skillsObj.tools : []),
              ...(Array.isArray(skillsObj.cloudPlatforms)
                ? skillsObj.cloudPlatforms
                : []),
              ...(Array.isArray(skillsObj.other) ? skillsObj.other : []),
            ].filter((skill) => typeof skill === "string");
            technicalSkills = [...new Set(technicalSkills)];
          } else {
            // Empty array or unexpected format
            technicalSkills = [];
          }
        } else if (
          typeof skillsData === "object" &&
          !Array.isArray(skillsData)
        ) {
          // Categorized format - combine all categories into one array
          technicalSkills = [
            ...(Array.isArray(skillsData.programmingLanguages)
              ? skillsData.programmingLanguages
              : []),
            ...(Array.isArray(skillsData.frameworks)
              ? skillsData.frameworks
              : []),
            ...(Array.isArray(skillsData.databases)
              ? skillsData.databases
              : []),
            ...(Array.isArray(skillsData.tools) ? skillsData.tools : []),
            ...(Array.isArray(skillsData.cloudPlatforms)
              ? skillsData.cloudPlatforms
              : []),
            ...(Array.isArray(skillsData.other) ? skillsData.other : []),
          ].filter((skill) => typeof skill === "string");
          // Remove duplicates
          technicalSkills = [...new Set(technicalSkills)];
        }
      }
    }

    // Ensure technicalSkills is always an array of strings
    if (!Array.isArray(technicalSkills)) {
      technicalSkills = [];
    }

    // Final validation: ensure all items are strings
    technicalSkills = technicalSkills
      .filter(
        (skill) =>
          skill !== null && skill !== undefined && typeof skill === "string"
      )
      .map((skill) => String(skill).trim())
      .filter((skill) => skill.length > 0);

    return {
      personalInformation: extractedData.personalInformation || {},
      technicalSkills: technicalSkills,
      yearsOfExperience: extractedData.yearsOfExperience || null,
      education: extractedData.education || [],
      extractedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to extract CV information", 500);
  }
}

/**
 * Analyze CV and return ATS score
 */
export async function analyzeCV(fileBuffer, fileType) {
  try {
    // Extract text from CV
    const cvText = await extractCVText(fileBuffer, fileType);

    // Create comprehensive ATS analysis prompt
    const analysisPrompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze the following CV and provide a detailed assessment.

CV Content:
${cvText}

Please analyze this CV based on the following ATS criteria:
1. **Formatting & Structure** (20 points): Is the CV well-formatted, easy to parse, and properly structured?
2. **Keywords & Skills** (20 points): Are relevant keywords, technical skills, and industry terms present?
3. **Contact Information** (10 points): Is contact information complete and properly formatted?
4. **Work Experience** (20 points): Are job descriptions clear, with quantifiable achievements?
5. **Education** (10 points): Is education information complete and relevant?
6. **Sections Completeness** (10 points): Are all standard sections (summary, experience, education, skills) present?
7. **ATS Compatibility** (10 points): Is the CV optimized for ATS parsing (no complex formatting, proper headings)?

Provide your analysis in the following JSON format:
{
  "score": <number between 0-100>,
  "feedback": {
    "strengths": [<array of strengths>],
    "weaknesses": [<array of weaknesses>],
    "recommendations": [<array of actionable recommendations>]
  },
  "breakdown": {
    "formatting": <score 0-20>,
    "keywords": <score 0-20>,
    "contact": <score 0-10>,
    "experience": <score 0-20>,
    "education": <score 0-10>,
    "sections": <score 0-10>,
    "atsCompatibility": <score 0-10>
  }
}

Return ONLY valid JSON, no additional text.`;

    // Get structured response from OpenAI
    const response = await openai.invoke(analysisPrompt);
    const responseText = response.content.trim();

    // Parse JSON response (handle markdown code blocks if present)
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(responseText);
      }
    } catch (parseError) {
      throw new AppError("Failed to parse CV analysis response", 500);
    }

    // After getting ATS score, also extract CV information
    const cvInformation = await extractCVInformation(fileBuffer, fileType);

    // Combine ATS score with extracted information
    return {
      atsScore: {
        score: Math.round(analysisResult.score || 0),
        feedback: {
          strengths: analysisResult.feedback?.strengths || [],
          weaknesses: analysisResult.feedback?.weaknesses || [],
          recommendations: analysisResult.feedback?.recommendations || [],
        },
        breakdown: analysisResult.breakdown || {},
        analyzedAt: new Date(),
      },
      personalInformation: cvInformation.personalInformation,
      technicalSkills: cvInformation.technicalSkills,
      yearsOfExperience: cvInformation.yearsOfExperience,
      education: cvInformation.education,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to analyze CV", 500);
  }
}
