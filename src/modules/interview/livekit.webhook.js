import { WebhookReceiver } from "livekit-server-sdk";
import { config } from "../../config/env.js";
import { processUserAudio } from "./livekit-interview.service.js";
import { AppError } from "../../utils/AppError.js";

// Initialize webhook receiver
let receiver = null;
if (config.livekit.apiKey && config.livekit.secret) {
  receiver = new WebhookReceiver(config.livekit.apiKey, config.livekit.secret);
}

/**
 * Verify and parse LiveKit webhook event
 * @param {Object} req - Express request object
 * @returns {Object} Parsed webhook event
 */
export function verifyWebhook(req) {
  try {
    if (!receiver) {
      throw new AppError("LiveKit webhook receiver not initialized", 500);
    }

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError("Missing authorization header", 401);
    }

    // Verify and receive webhook
    const event = receiver.receive(
      authHeader,
      req.body || req.rawBody
    );

    return event;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to verify webhook: ${error.message}`,
      401
    );
  }
}

/**
 * Handle LiveKit webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
export async function handleWebhook(req, res, next) {
  try {
    // Verify webhook
    const event = verifyWebhook(req);

    // Handle different event types
    switch (event.event) {
      case "room_started":
        await handleRoomStarted(event);
        break;

      case "room_finished":
        await handleRoomFinished(event);
        break;

      case "participant_connected":
        await handleParticipantConnected(event);
        break;

      case "participant_disconnected":
        await handleParticipantDisconnected(event);
        break;

      case "track_published":
        await handleTrackPublished(event);
        break;

      case "track_subscribed":
        await handleTrackSubscribed(event);
        break;

      case "track_unpublished":
        await handleTrackUnpublished(event);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    // Respond to LiveKit
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode || 500).json({
        error: error.message,
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Handle room started event
 * @param {Object} event - Webhook event
 */
async function handleRoomStarted(event) {
  console.log(`Room started: ${event.room.name}`);
  // Room metadata contains session info
  if (event.room.metadata) {
    try {
      const metadata = JSON.parse(event.room.metadata);
      console.log(`Room metadata:`, metadata);
    } catch (e) {
      console.error("Failed to parse room metadata:", e);
    }
  }
}

/**
 * Handle room finished event
 * @param {Object} event - Webhook event
 */
async function handleRoomFinished(event) {
  console.log(`Room finished: ${event.room.name}`);
  // Room cleanup is handled by endVoiceInterview
}

/**
 * Handle participant connected event
 * @param {Object} event - Webhook event
 */
async function handleParticipantConnected(event) {
  console.log(
    `Participant connected: ${event.participant.identity} to room ${event.room.name}`
  );
}

/**
 * Handle participant disconnected event
 * @param {Object} event - Webhook event
 */
async function handleParticipantDisconnected(event) {
  console.log(
    `Participant disconnected: ${event.participant.identity} from room ${event.room.name}`
  );
}

/**
 * Handle track published event (audio input available)
 * @param {Object} event - Webhook event
 */
async function handleTrackPublished(event) {
  console.log(
    `Track published: ${event.publication.trackName} (${event.publication.kind}) by ${event.participant.identity}`
  );

  // If it's an audio track from a participant, we can process it
  if (
    event.publication.kind === "audio" &&
    event.participant.identity !== "AI-Interviewer"
  ) {
    // Extract session ID from room name
    const roomName = event.room.name;
    const sessionId = roomName.replace("interview-", "");

    console.log(`Audio track published for session: ${sessionId}`);
    // Note: Actual audio processing would require subscribing to the track
    // This is typically done via LiveKit client SDK or server SDK
  }
}

/**
 * Handle track subscribed event
 * @param {Object} event - Webhook event
 */
async function handleTrackSubscribed(event) {
  console.log(
    `Track subscribed: ${event.track.name} (${event.track.kind})`
  );
}

/**
 * Handle track unpublished event
 * @param {Object} event - Webhook event
 */
async function handleTrackUnpublished(event) {
  console.log(
    `Track unpublished: ${event.publication.trackName}`
  );
}

/**
 * Process audio data from LiveKit track
 * Note: This is a placeholder - actual audio processing requires
 * subscribing to tracks via LiveKit SDK
 * @param {Buffer} audioBuffer - Audio buffer from LiveKit track
 * @param {string} sessionId - Interview session ID
 * @returns {Promise<Object>} Processed audio response
 */
export async function processLiveKitAudio(audioBuffer, sessionId) {
  try {
    // Process user audio and get AI response
    const result = await processUserAudio(audioBuffer, sessionId);
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Failed to process LiveKit audio: ${error.message}`,
      500
    );
  }
}

