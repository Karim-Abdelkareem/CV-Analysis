import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import asyncHandler from "express-async-handler";
import {
  startVoiceInterview,
  endVoiceInterview,
  generateInitialGreeting,
  processUserAudio,
  generateAIResponse,
} from "./livekit-interview.service.js";
import { generateAccessToken } from "./livekit.service.js";
import { handleWebhook } from "./livekit.webhook.js";
import { AppError } from "../../utils/AppError.js";

const router = Router();

/**
 * Generate LiveKit access token
 * POST /api/v1/interview/livekit/token
 */
router.post(
  "/token",
  protect,
  asyncHandler(async (req, res) => {
    const { roomName, participantName, voiceGender } = req.body;

    if (!roomName) {
      throw new AppError("Room name is required", 400);
    }

    const participantIdentity = req.user._id.toString();
    const displayName =
      participantName || req.user.email || `User-${participantIdentity}`;

    const token = await generateAccessToken(
      roomName,
      displayName,
      participantIdentity,
      { ttl: "6h" }
    );

    res.status(200).json({
      status: "success",
      data: {
        token,
        roomName,
        participantIdentity,
        participantName: displayName,
      },
    });
  })
);

/**
 * Start voice interview session
 * POST /api/v1/interview/livekit/start
 */
router.post(
  "/start",
  protect,
  asyncHandler(async (req, res) => {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:58",
        message: "/start endpoint called",
        data: {
          voiceGender: req.body.voiceGender,
          userId: req.user._id.toString(),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    const { voiceGender } = req.body;
    const userId = req.user._id.toString();

    const sessionInfo = await startVoiceInterview(
      userId,
      voiceGender || "neutral"
    );

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:71",
        message: "sessionInfo received",
        data: {
          sessionId: sessionInfo.sessionId,
          roomName: sessionInfo.roomName,
          tokenType: typeof sessionInfo.token,
          tokenLength: sessionInfo.token?.length,
          voiceGender: sessionInfo.voiceGender,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    // Generate initial greeting
    const greeting = await generateInitialGreeting(sessionInfo.sessionId);

    const responseData = {
      status: "success",
      data: {
        ...sessionInfo,
        initialGreeting: {
          text: greeting.greeting,
          // Note: Audio buffer would be sent via LiveKit track in production
        },
      },
    };

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:84",
        message: "sending response",
        data: {
          tokenType: typeof responseData.data.token,
          tokenLength: responseData.data.token?.length,
          tokenPreview:
            typeof responseData.data.token === "string"
              ? responseData.data.token.substring(0, 50)
              : JSON.stringify(responseData.data.token).substring(0, 100),
          roomName: responseData.data.roomName,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "E",
      }),
    }).catch(() => {});
    // #endregion

    res.status(200).json(responseData);
  })
);

/**
 * End voice interview session
 * POST /api/v1/interview/livekit/end
 */
router.post(
  "/end",
  protect,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    const session = await endVoiceInterview(sessionId);

    res.status(200).json({
      status: "success",
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        summary: session.summary,
        message: "Voice interview session ended successfully",
      },
    });
  })
);

/**
 * Process user audio and get AI response
 * POST /api/v1/interview/livekit/process-audio
 */
router.post(
  "/process-audio",
  protect,
  asyncHandler(async (req, res) => {
    const { sessionId, audioData } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    if (!audioData) {
      throw new AppError("Audio data is required", 400);
    }

    // Convert base64 audio data to buffer if needed
    let audioBuffer;
    if (typeof audioData === "string") {
      audioBuffer = Buffer.from(audioData, "base64");
    } else {
      audioBuffer = Buffer.from(audioData);
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:207",
        message: "processing user audio",
        data: {
          sessionId,
          audioBufferSize: audioBuffer?.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H",
      }),
    }).catch(() => {});
    // #endregion

    const result = await processUserAudio(audioBuffer, sessionId);

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:216",
        message: "processUserAudio result",
        data: {
          sessionId,
          hasUserTranscript: !!result.userTranscript,
          userTranscriptLength: result.userTranscript?.length,
          hasAiResponse: !!result.aiResponse,
          aiResponseLength: result.aiResponse?.length,
          hasAudioBuffer: !!result.audioBuffer,
          audioBufferSize: result.audioBuffer?.length,
          audioBufferType: Buffer.isBuffer(result.audioBuffer),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H",
      }),
    }).catch(() => {});
    // #endregion

    const audioBase64 = result.audioBuffer.toString("base64");

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.routes.js:235",
        message: "sending response with audio",
        data: {
          sessionId,
          audioBase64Length: audioBase64?.length,
          aiResponseLength: result.aiResponse?.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H",
      }),
    }).catch(() => {});
    // #endregion

    res.status(200).json({
      status: "success",
      data: {
        userTranscript: result.userTranscript,
        aiResponse: result.aiResponse,
        // Note: Audio buffer would be sent via LiveKit track in production
        // For now, return base64 encoded audio
        audioResponse: audioBase64,
      },
    });
  })
);

/**
 * Generate AI response from text (fallback if audio processing fails)
 * POST /api/v1/interview/livekit/generate-response
 */
router.post(
  "/generate-response",
  protect,
  asyncHandler(async (req, res) => {
    const { sessionId, userText } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    if (!userText || userText.trim().length === 0) {
      throw new AppError("User text is required", 400);
    }

    const result = await generateAIResponse(sessionId, userText);

    res.status(200).json({
      status: "success",
      data: {
        aiResponse: result.aiResponse,
        // Note: Audio buffer would be sent via LiveKit track in production
        audioResponse: result.audioBuffer.toString("base64"),
      },
    });
  })
);

/**
 * LiveKit webhook endpoint (no auth required - uses webhook signature)
 * POST /api/v1/interview/livekit/webhook
 */
router.post("/webhook", handleWebhook);

export default router;
