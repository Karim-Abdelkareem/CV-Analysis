import {
  initializeInterviewSession,
  streamInterviewResponse,
  finalizeInterviewSession,
  cancelInterviewSession,
} from "./interview.service.js";
import {
  generateAccessToken,
  createRoom,
  deleteRoom,
} from "./livekit.service.js";
import { transcribeLiveKitAudio } from "./whisper.service.js";
import { synthesizeSpeechWithGender, getVoiceByGender } from "./tts.service.js";
import { AppError } from "../../utils/AppError.js";
import InterviewSession from "./interview-session.model.js";

// Store active voice interview sessions
// Map<sessionId, { roomName, voiceGender, audioBuffer }>
const activeVoiceSessions = new Map();

/**
 * Start a voice interview session
 * @param {string} userId - User ID
 * @param {string} voiceGender - Voice gender: 'male', 'female', or 'neutral'
 * @returns {Promise<Object>} Session info with LiveKit token and room name
 */
export async function startVoiceInterview(userId, voiceGender = "neutral") {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "livekit-interview.service.js:27",
      message: "startVoiceInterview called",
      data: { userId, voiceGender },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "D",
    }),
  }).catch(() => {});
  // #endregion

  try {
    // Validate voice gender
    const validGenders = ["male", "female", "neutral"];
    if (!validGenders.includes(voiceGender)) {
      voiceGender = "neutral";
    }

    // Initialize interview session with voice type
    const session = await initializeInterviewSession(userId);

    // Mark as voice interview
    session.interviewType = "voice";
    session.voiceGender = voiceGender;

    // Generate unique room name
    const roomName = `interview-${session._id.toString()}`;
    session.livekitRoomName = roomName;

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:47",
        message: "creating LiveKit room",
        data: { roomName, sessionId: session._id.toString() },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    // Create LiveKit room
    await createRoom(roomName, {
      emptyTimeout: 30 * 60, // 30 minutes
      maxParticipants: 2, // User + AI
      metadata: JSON.stringify({
        sessionId: session._id.toString(),
        userId: userId,
        interviewType: "voice",
      }),
    });

    // Save session
    await session.save();

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:61",
        message: "generating access token",
        data: { roomName, userId },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    // Generate access token for user
    const token = await generateAccessToken(
      roomName,
      `User-${userId}`,
      userId,
      { ttl: "6h" }
    );

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:68",
        message: "token generated",
        data: {
          tokenType: typeof token,
          tokenLength: token?.length,
          tokenPreview:
            typeof token === "string"
              ? token.substring(0, 50)
              : JSON.stringify(token).substring(0, 100),
          roomName,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    // Store in active sessions
    activeVoiceSessions.set(session._id.toString(), {
      roomName,
      voiceGender,
      audioBuffer: null,
      session,
    });

    const result = {
      sessionId: session._id.toString(),
      roomName,
      token,
      voiceGender,
      status: "active",
    };

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:82",
        message: "startVoiceInterview success",
        data: {
          sessionId: result.sessionId,
          roomName: result.roomName,
          tokenType: typeof result.token,
          tokenLength: result.token?.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    return result;
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:87",
        message: "startVoiceInterview error",
        data: {
          error: error.message,
          errorName: error.name,
          errorStack: error.stack?.substring(0, 300),
          isAppError: error instanceof AppError,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to start voice interview: ${error.message}`,
      500
    );
  }
}

/**
 * Process user audio and generate AI response
 * @param {Buffer} audioBuffer - Audio buffer from LiveKit
 * @param {string} sessionId - Interview session ID
 * @returns {Promise<Object>} AI response audio and transcript
 */
export async function processUserAudio(audioBuffer, sessionId) {
  try {
    const sessionData = activeVoiceSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Voice interview session not found", 404);
    }

    // Transcribe audio using Whisper
    const userText = await transcribeLiveKitAudio(audioBuffer, {
      language: undefined, // Auto-detect
    });

    if (!userText || userText.trim().length === 0) {
      throw new AppError("No speech detected in audio", 400);
    }

    // Get AI response using existing LLM service
    const { fullResponse } = await streamInterviewResponse(sessionId, userText);

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:235",
        message: "generating TTS audio",
        data: {
          sessionId,
          aiResponseLength: fullResponse?.length,
          voiceGender: sessionData.voiceGender,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion

    // Generate speech from AI response
    const audioResponse = await synthesizeSpeechWithGender(
      fullResponse,
      sessionData.voiceGender
    );

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:244",
        message: "TTS audio generated",
        data: {
          sessionId,
          audioBufferSize: audioResponse?.length,
          audioBufferType: Buffer.isBuffer(audioResponse),
          aiResponseLength: fullResponse?.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion

    return {
      userTranscript: userText,
      aiResponse: fullResponse,
      audioBuffer: audioResponse,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to process user audio: ${error.message}`, 500);
  }
}

/**
 * Generate AI response and convert to speech
 * @param {string} sessionId - Interview session ID
 * @param {string} userText - User's text input (if not from audio)
 * @returns {Promise<Object>} AI response with audio
 */
export async function generateAIResponse(sessionId, userText) {
  try {
    const sessionData = activeVoiceSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Voice interview session not found", 404);
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:268",
        message: "generating AI response",
        data: { sessionId, userTextLength: userText?.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion

    // Get AI response using existing LLM service
    const { fullResponse } = await streamInterviewResponse(sessionId, userText);

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:271",
        message: "AI response received",
        data: {
          sessionId,
          aiResponseLength: fullResponse?.length,
          voiceGender: sessionData.voiceGender,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion

    // Generate speech from AI response
    const audioResponse = await synthesizeSpeechWithGender(
      fullResponse,
      sessionData.voiceGender
    );

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit-interview.service.js:278",
        message: "TTS audio generated for generateAIResponse",
        data: {
          sessionId,
          audioBufferSize: audioResponse?.length,
          audioBufferType: Buffer.isBuffer(audioResponse),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion

    return {
      aiResponse: fullResponse,
      audioBuffer: audioResponse,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to generate AI response: ${error.message}`, 500);
  }
}

/**
 * Speak AI response (convert text to speech)
 * @param {string} sessionId - Interview session ID
 * @param {string} aiText - AI response text
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function speakAIResponse(sessionId, aiText) {
  try {
    const sessionData = activeVoiceSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Voice interview session not found", 404);
    }

    const audioBuffer = await synthesizeSpeechWithGender(
      aiText,
      sessionData.voiceGender
    );

    return audioBuffer;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to speak AI response: ${error.message}`, 500);
  }
}

/**
 * End voice interview session
 * @param {string} sessionId - Interview session ID
 * @returns {Promise<Object>} Finalized session
 */
export async function endVoiceInterview(sessionId) {
  try {
    const sessionData = activeVoiceSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Voice interview session not found", 404);
    }

    // Finalize interview session (reuse existing service)
    const session = await finalizeInterviewSession(sessionId);

    // Delete LiveKit room
    if (sessionData.roomName) {
      await deleteRoom(sessionData.roomName);
    }

    // Remove from active sessions
    activeVoiceSessions.delete(sessionId);

    return session;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to end voice interview: ${error.message}`, 500);
  }
}

/**
 * Get voice interview session info
 * @param {string} sessionId - Interview session ID
 * @returns {Object|null} Session data or null if not found
 */
export function getVoiceInterviewSession(sessionId) {
  return activeVoiceSessions.get(sessionId) || null;
}

/**
 * Generate initial greeting for voice interview
 * @param {string} sessionId - Interview session ID
 * @returns {Promise<Object>} Greeting text and audio
 */
export async function generateInitialGreeting(sessionId) {
  try {
    const sessionData = activeVoiceSessions.get(sessionId);
    if (!sessionData) {
      throw new AppError("Voice interview session not found", 404);
    }

    // Use existing LLM service to generate initial greeting
    const { fullResponse } = await streamInterviewResponse(
      sessionId,
      "Please start the interview with a friendly greeting and your first question."
    );

    // Generate speech from greeting
    const audioBuffer = await synthesizeSpeechWithGender(
      fullResponse,
      sessionData.voiceGender
    );

    return {
      greeting: fullResponse,
      audioBuffer: audioBuffer,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to generate initial greeting: ${error.message}`,
      500
    );
  }
}
