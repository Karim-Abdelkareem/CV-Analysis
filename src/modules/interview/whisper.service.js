import OpenAI from "openai";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai_key,
});

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {Buffer|File|string} audioInput - Audio file buffer, File object, or file path
 * @param {Object} options - Transcription options
 * @param {string} options.language - Language code (e.g., 'en', 'ar') - optional, auto-detect if not provided
 * @param {string} options.prompt - Optional text to guide the model's style
 * @param {string} options.response_format - Response format: 'json', 'text', 'srt', 'verbose_json', 'vtt'
 * @param {number} options.temperature - Temperature for randomness (0-1)
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioInput, options = {}) {
  try {
    if (!config.openai_key) {
      throw new AppError("OpenAI API key is not configured", 500);
    }

    const {
      language,
      prompt,
      response_format = "text",
      temperature = 0,
    } = options;

    // Prepare the audio file
    // OpenAI SDK accepts File, Buffer, or file path
    let file = audioInput;
    
    if (Buffer.isBuffer(audioInput)) {
      // For Node.js, create a File object from Buffer
      // Node.js 18+ has File API, otherwise we'll use a workaround
      try {
        if (typeof File !== "undefined") {
          file = new File([audioInput], "audio.webm", { type: "audio/webm" });
        } else {
          // Use OpenAI SDK's FileFromPath or pass buffer directly
          // OpenAI SDK v4+ accepts Buffer directly
          file = audioInput;
        }
      } catch (e) {
        // Fallback: pass buffer directly (OpenAI SDK may accept it)
        file = audioInput;
      }
    } else if (typeof audioInput === "string") {
      // File path - OpenAI SDK can handle this with FileFromPath
      // For now, read the file and create File object
      const fs = await import("fs/promises");
      const fileData = await fs.readFile(audioInput);
      if (typeof File !== "undefined") {
        file = new File([fileData], "audio.webm", { type: "audio/webm" });
      } else {
        file = fileData;
      }
    }

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: language, // Optional: 'en', 'ar', etc.
      prompt: prompt, // Optional: context prompt
      response_format: response_format,
      temperature: temperature,
    });

    // Extract text from response
    if (response_format === "json" || response_format === "verbose_json") {
      return transcription.text || transcription;
    }

    return transcription;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // Handle OpenAI API errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        throw new AppError("Invalid OpenAI API key", 401);
      } else if (status === 429) {
        throw new AppError("OpenAI API rate limit exceeded", 429);
      } else if (status === 413) {
        throw new AppError("Audio file too large (max 25MB)", 413);
      }

      throw new AppError(`Whisper API error: ${message}`, status);
    }

    throw new AppError(
      `Failed to transcribe audio: ${error.message}`,
      500
    );
  }
}

/**
 * Transcribe audio stream (for real-time transcription)
 * Note: OpenAI Whisper API doesn't support true streaming, but we can process chunks
 * @param {ReadableStream|Buffer} audioStream - Audio stream or buffer
 * @param {Object} options - Transcription options
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeStream(audioStream, options = {}) {
  try {
    // For streaming, we accumulate audio chunks and transcribe when we have enough data
    // OpenAI Whisper requires complete audio files, so we buffer and send periodically

    if (audioStream instanceof ReadableStream) {
      // Convert stream to buffer
      const chunks = [];
      const reader = audioStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks);
      return await transcribeAudio(buffer, options);
    }

    // If it's already a buffer, transcribe directly
    return await transcribeAudio(audioStream, options);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to transcribe audio stream: ${error.message}`,
      500
    );
  }
}

/**
 * Transcribe audio from LiveKit audio track
 * @param {Buffer} audioBuffer - Audio buffer from LiveKit
 * @param {Object} options - Transcription options
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeLiveKitAudio(audioBuffer, options = {}) {
  try {
    // LiveKit audio is typically in Opus/WebM format
    // Whisper API accepts various formats, but we may need to convert
    return await transcribeAudio(audioBuffer, {
      ...options,
      // Default to auto-detect language for interviews
      language: options.language || undefined,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to transcribe LiveKit audio: ${error.message}`,
      500
    );
  }
}

