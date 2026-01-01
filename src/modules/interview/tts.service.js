import OpenAI from "openai";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai_key,
});

// Voice mapping by gender
const VOICE_MAP = {
  male: ["alloy", "echo"], // OpenAI TTS male voices
  female: ["nova", "shimmer"], // OpenAI TTS female voices
  neutral: ["onyx", "fable"], // OpenAI TTS neutral voices
};

/**
 * Get OpenAI voice by gender preference
 * @param {string} gender - Gender preference: 'male', 'female', or 'neutral'
 * @param {number} index - Index to select from available voices (default: 0)
 * @returns {string} OpenAI voice name
 */
export function getVoiceByGender(gender = "neutral", index = 0) {
  const voices = VOICE_MAP[gender.toLowerCase()] || VOICE_MAP.neutral;

  if (index < 0 || index >= voices.length) {
    index = 0;
  }

  return voices[index];
}

/**
 * Get all available voices for a gender
 * @param {string} gender - Gender preference: 'male', 'female', or 'neutral'
 * @returns {Array<string>} Array of available voice names
 */
export function getVoicesByGender(gender = "neutral") {
  return VOICE_MAP[gender.toLowerCase()] || VOICE_MAP.neutral;
}

/**
 * Synthesize speech from text using OpenAI TTS API
 * @param {string} text - Text to convert to speech
 * @param {string|Object} voiceOrOptions - Voice name or options object
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice name: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
 * @param {string} options.model - Model: 'tts-1' (fast) or 'tts-1-hd' (high quality)
 * @param {number} options.speed - Speech speed: 0.25 to 4.0 (default: 1.0)
 * @param {string} options.response_format - Audio format: 'mp3', 'opus', 'aac', 'flac'
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function synthesizeSpeech(text, voiceOrOptions = {}, options = {}) {
  try {
    if (!config.openai_key) {
      throw new AppError("OpenAI API key is not configured", 500);
    }

    if (!text || text.trim().length === 0) {
      throw new AppError("Text cannot be empty", 400);
    }

    // Handle voice parameter - can be string or part of options
    let voice;
    let ttsOptions = {};

    if (typeof voiceOrOptions === "string") {
      voice = voiceOrOptions;
      ttsOptions = options;
    } else {
      ttsOptions = voiceOrOptions;
      voice = ttsOptions.voice || "onyx";
    }

    // Validate voice
    const validVoices = [
      "alloy",
      "echo",
      "fable",
      "onyx",
      "nova",
      "shimmer",
    ];
    if (!validVoices.includes(voice)) {
      voice = "onyx"; // Default to neutral voice
    }

    // Prepare TTS options
    const {
      model = "tts-1", // 'tts-1' or 'tts-1-hd'
      speed = 1.0, // 0.25 to 4.0
      response_format = "mp3", // 'mp3', 'opus', 'aac', 'flac'
    } = ttsOptions;

    // Validate speed
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "tts.service.js:98",
        message: "calling OpenAI TTS API",
        data: {
          textLength: text?.length,
          voice,
          model,
          speed: validSpeed,
          response_format,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "G",
      }),
    }).catch(() => {});
    // #endregion

    // Call OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      speed: validSpeed,
      response_format: response_format,
    });

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "tts.service.js:108",
        message: "OpenAI TTS response received",
        data: {
          hasResponse: !!response,
          responseType: typeof response,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "G",
      }),
    }).catch(() => {});
    // #endregion

    // Convert response to buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "tts.service.js:110",
        message: "audio buffer created",
        data: {
          bufferSize: buffer?.length,
          bufferType: Buffer.isBuffer(buffer),
          isEmpty: buffer?.length === 0,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "G",
      }),
    }).catch(() => {});
    // #endregion

    return buffer;
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
      } else if (status === 400) {
        throw new AppError(`Invalid TTS request: ${message}`, 400);
      }

      throw new AppError(`TTS API error: ${message}`, status);
    }

    throw new AppError(`Failed to synthesize speech: ${error.message}`, 500);
  }
}

/**
 * Synthesize speech with gender-based voice selection
 * @param {string} text - Text to convert to speech
 * @param {string} gender - Gender preference: 'male', 'female', or 'neutral'
 * @param {Object} options - Additional TTS options
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function synthesizeSpeechWithGender(
  text,
  gender = "neutral",
  options = {}
) {
  const voice = getVoiceByGender(gender, options.voiceIndex || 0);
  return await synthesizeSpeech(text, { ...options, voice });
}

/**
 * Stream speech audio to LiveKit room
 * Note: This is a placeholder - actual streaming would require LiveKit E2EE or data tracks
 * @param {string} text - Text to convert to speech
 * @param {string} roomName - LiveKit room name
 * @param {string} participantSid - Participant SID to send audio to
 * @param {Object} options - TTS and streaming options
 * @returns {Promise<Buffer>} Audio buffer (to be sent via LiveKit)
 */
export async function streamSpeechToRoom(
  text,
  roomName,
  participantSid,
  options = {}
) {
  try {
    // Generate audio
    const audioBuffer = await synthesizeSpeechWithGender(
      text,
      options.gender || "neutral",
      options
    );

    // Note: Actual streaming to LiveKit would require:
    // 1. Creating an audio track from the buffer
    // 2. Publishing the track to the room
    // 3. Subscribing the participant to the track
    // This is typically handled by the LiveKit client SDK or server SDK

    return audioBuffer;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to stream speech to room: ${error.message}`,
      500
    );
  }
}

