import { AccessToken } from "livekit-server-sdk";
import { RoomServiceClient } from "livekit-server-sdk";
import { config } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

// Initialize LiveKit room service client
let roomService = null;
// #region agent log
fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    location: "livekit.service.js:8",
    message: "checking LiveKit config",
    data: {
      hasApiKey: !!config.livekit?.apiKey,
      hasSecret: !!config.livekit?.secret,
      hasUrl: !!config.livekit?.url,
      apiKeyLength: config.livekit?.apiKey?.length,
      secretLength: config.livekit?.secret?.length,
      urlValue: config.livekit?.url,
      urlStartsWithWss: config.livekit?.url?.startsWith("wss://"),
      urlStartsWithWs: config.livekit?.url?.startsWith("ws://"),
    },
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: "A",
  }),
}).catch(() => {});
// #endregion
if (config.livekit?.apiKey && config.livekit?.secret) {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "livekit.service.js:10",
      message: "initializing LiveKit room service",
      data: { url: config.livekit.url },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion
  roomService = new RoomServiceClient(
    config.livekit.url,
    config.livekit.apiKey,
    config.livekit.secret
  );
} else {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "livekit.service.js:14",
      message: "LiveKit config missing",
      data: {
        missingApiKey: !config.livekit?.apiKey,
        missingSecret: !config.livekit?.secret,
        missingUrl: !config.livekit?.url,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion
}

/**
 * Generate LiveKit access token for a participant
 * @param {string} roomName - Name of the LiveKit room
 * @param {string} participantName - Display name of the participant
 * @param {string} participantIdentity - Unique identity (usually userId)
 * @param {Object} options - Additional token options
 * @returns {string} JWT access token
 */
export async function generateAccessToken(
  roomName,
  participantName,
  participantIdentity,
  options = {}
) {
  try {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.service.js:34",
        message: "generateAccessToken called",
        data: {
          roomName,
          participantName,
          participantIdentity,
          hasApiKey: !!config.livekit?.apiKey,
          hasSecret: !!config.livekit?.secret,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    if (!config.livekit?.apiKey || !config.livekit?.secret) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "livekit.service.js:41",
            message: "missing LiveKit credentials",
            data: {
              hasApiKey: !!config.livekit?.apiKey,
              hasSecret: !!config.livekit?.secret,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }
      ).catch(() => {});
      // #endregion
      throw new AppError("LiveKit API key and secret must be configured", 500);
    }

    // Set token expiration (default: 6 hours)
    // TTL can be string like "6h" or number in seconds
    const ttl = options.ttl || "6h";

    // Create AccessToken with API key, secret, and identity
    const at = new AccessToken(config.livekit.apiKey, config.livekit.secret, {
      identity: participantIdentity,
      name: participantName || participantIdentity,
      ttl: ttl, // Set TTL in constructor
    });

    // Grant permissions for the room
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token - toJwt() is a synchronous method
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.service.js:154",
        message: "calling toJwt()",
        data: {
          roomName,
          participantIdentity,
          hasAccessToken: !!at,
          accessTokenType: typeof at,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    let jwtToken;
    try {
      // toJwt() may be async in newer versions, try both sync and async
      const jwtResult = at.toJwt();
      if (typeof jwtResult === "string") {
        jwtToken = jwtResult;
      } else if (jwtResult && typeof jwtResult.then === "function") {
        // It's a Promise
        jwtToken = await jwtResult;
      } else {
        // Fallback: try to stringify or get token property
        jwtToken = jwtResult?.token || jwtResult?.jwt || String(jwtResult);
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "livekit.service.js:170",
            message: "toJwt() result",
            data: {
              tokenType: typeof jwtToken,
              tokenIsString: typeof jwtToken === "string",
              tokenLength: jwtToken?.length,
              tokenIsObject: typeof jwtToken === "object",
              tokenPreview:
                typeof jwtToken === "string"
                  ? jwtToken.substring(0, 50)
                  : JSON.stringify(jwtToken).substring(0, 100),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }
      ).catch(() => {});
      // #endregion
    } catch (jwtError) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "livekit.service.js:190",
            message: "toJwt() error",
            data: {
              error: jwtError.message,
              errorName: jwtError.name,
              errorStack: jwtError.stack?.substring(0, 200),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }
      ).catch(() => {});
      // #endregion
      throw new AppError(
        `Failed to generate JWT token: ${jwtError.message}`,
        500
      );
    }

    // Validate token is a string
    if (!jwtToken || typeof jwtToken !== "string") {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "livekit.service.js:210",
            message: "invalid token format - not a string",
            data: {
              tokenType: typeof jwtToken,
              tokenValue: jwtToken,
              tokenStringified: JSON.stringify(jwtToken),
              isObject: typeof jwtToken === "object",
              isNull: jwtToken === null,
              isUndefined: jwtToken === undefined,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }
      ).catch(() => {});
      // #endregion
      throw new AppError(
        `Failed to generate valid JWT token. Expected string but got ${typeof jwtToken}.`,
        500
      );
    }

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.service.js:235",
        message: "token generated successfully",
        data: {
          roomName,
          participantIdentity,
          ttl,
          tokenLength: jwtToken.length,
          tokenPreview: jwtToken.substring(0, 50),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    return jwtToken;
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.service.js:72",
        message: "token generation error",
        data: { error: error.message, errorName: error.name },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to generate LiveKit access token: ${error.message}`,
      500
    );
  }
}

/**
 * Create a LiveKit room
 * @param {string} roomName - Name of the room to create
 * @param {Object} options - Room creation options
 * @returns {Promise<Object>} Room information
 */
export async function createRoom(roomName, options = {}) {
  try {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "livekit.service.js:78",
        message: "createRoom called",
        data: {
          roomName,
          hasRoomService: !!roomService,
          configCheck: {
            hasApiKey: !!config.livekit?.apiKey,
            hasSecret: !!config.livekit?.secret,
            hasUrl: !!config.livekit?.url,
          },
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    if (!roomService) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "livekit.service.js:81",
            message: "roomService is null",
            data: {
              envVars: {
                LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
                LIVEKIT_SECRET: !!process.env.LIVEKIT_SECRET,
                LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET,
                LIVEKIT_URL: !!process.env.LIVEKIT_URL,
              },
              config: {
                hasApiKey: !!config.livekit?.apiKey,
                hasSecret: !!config.livekit?.secret,
                hasUrl: !!config.livekit?.url,
              },
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion
      const missingVars = [];
      if (!config.livekit?.url) missingVars.push("LIVEKIT_URL");
      if (!config.livekit?.apiKey) missingVars.push("LIVEKIT_API_KEY");
      if (!config.livekit?.secret)
        missingVars.push("LIVEKIT_SECRET or LIVEKIT_API_SECRET");
      throw new AppError(
        `LiveKit room service not initialized. Missing environment variables: ${missingVars.join(
          ", "
        )}. Please add them to your .env file.`,
        500
      );
    }

    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: options.emptyTimeout || 10 * 60, // 10 minutes
      maxParticipants: options.maxParticipants || 10,
      metadata: options.metadata || "",
    });

    return room;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to create LiveKit room: ${error.message}`, 500);
  }
}

/**
 * Delete a LiveKit room
 * @param {string} roomName - Name of the room to delete
 * @returns {Promise<void>}
 */
export async function deleteRoom(roomName) {
  try {
    if (!roomService) {
      throw new AppError("LiveKit room service not initialized", 500);
    }

    await roomService.deleteRoom(roomName);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // Don't throw error if room doesn't exist
    console.error(`Failed to delete LiveKit room ${roomName}:`, error.message);
  }
}

/**
 * Get room information
 * @param {string} roomName - Name of the room
 * @returns {Promise<Object>} Room information
 */
export async function getRoom(roomName) {
  try {
    if (!roomService) {
      throw new AppError("LiveKit room service not initialized", 500);
    }

    const rooms = await roomService.listRooms([roomName]);
    return rooms.length > 0 ? rooms[0] : null;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to get LiveKit room: ${error.message}`, 500);
  }
}

/**
 * List all active rooms
 * @returns {Promise<Array>} List of active rooms
 */
export async function listRooms() {
  try {
    if (!roomService) {
      throw new AppError("LiveKit room service not initialized", 500);
    }

    const rooms = await roomService.listRooms();
    return rooms;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to list LiveKit rooms: ${error.message}`, 500);
  }
}
