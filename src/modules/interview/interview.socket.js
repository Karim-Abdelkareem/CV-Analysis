import {
  initializeInterviewSession,
  streamInterviewResponse,
  finalizeInterviewSession,
  cancelInterviewSession,
} from "./interview.service.js";
import { AppError } from "../../utils/AppError.js";

// Store socket sessions: Map<socketId, sessionId>
const socketSessions = new Map();

/**
 * Register interview socket event handlers
 */
export function registerInterviewHandlers(io, socket) {
  /**
   * Start a new interview session
   */
  socket.on("start-interview", async () => {
    try {
      const userId = socket.userId;

      // Initialize interview session
      const session = await initializeInterviewSession(userId);

      // Store session mapping
      socketSessions.set(socket.id, session._id.toString());

      // Store sessionId in socket for easy access
      socket.interviewSessionId = session._id.toString();

      // Emit session started
      socket.emit("session-started", {
        sessionId: session._id.toString(),
        status: "active",
        message: "Interview session started",
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:40',message:'starting initial interview greeting',data:{sessionId:session._id.toString(),userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // Get initial AI greeting/question
      const { tokens, fullResponse } = await streamInterviewResponse(
        session._id.toString(),
        "Please start the interview with a friendly greeting and your first question."
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:45',message:'initial greeting received',data:{sessionId:session._id.toString(),fullResponseLength:fullResponse?.length,containsQuestion:fullResponse?.includes('?'),fullResponsePreview:fullResponse?.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Stream the initial response token by token
      for (const token of tokens) {
        socket.emit("ai-message", {
          type: "token",
          content: token,
        });
      }

      // Emit completion
      socket.emit("ai-message", {
        type: "complete",
        content: fullResponse,
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      console.error("Error stack:", error.stack);
      
      const errorMessage =
        error instanceof AppError
          ? error.message
          : process.env.NODE_ENV === "development"
          ? `Failed to start interview: ${error.message}`
          : "Failed to start interview session. Please try again.";
      
      socket.emit("error", {
        message: errorMessage,
        type: error.name || "Error",
      });
    }
  });

  /**
   * Handle user message during interview
   */
  socket.on("user-message", async (data) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:79',message:'user-message event received',data:{socketId:socket.id,rawData:data,dataType:typeof data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const sessionId = socket.interviewSessionId;

      if (!sessionId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:84',message:'no sessionId found',data:{socketId:socket.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        socket.emit("error", {
          message: "No active interview session. Please start a new interview.",
        });
        return;
      }

      const userMessage = typeof data === "string" ? data : data?.message;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:90',message:'user message extracted',data:{sessionId,userMessage,messageLength:userMessage?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!userMessage || userMessage.trim().length === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:92',message:'empty user message rejected',data:{sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        socket.emit("error", {
          message: "Message cannot be empty",
        });
        return;
      }

      // Emit user message acknowledgment
      socket.emit("user-message-received", {
        message: userMessage,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:105',message:'calling streamInterviewResponse',data:{sessionId,userMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Stream AI response
      const { tokens, fullResponse } = await streamInterviewResponse(
        sessionId,
        userMessage
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:109',message:'streamInterviewResponse completed',data:{sessionId,tokenCount:tokens?.length,fullResponseLength:fullResponse?.length,fullResponsePreview:fullResponse?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Stream tokens
      for (const token of tokens) {
        socket.emit("ai-message", {
          type: "token",
          content: token,
        });
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/252c8f16-cb7d-4993-8ac1-944b637aa163',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'interview.socket.js:118',message:'emitting ai-message complete',data:{sessionId,fullResponseLength:fullResponse?.length,containsQuestion:fullResponse?.includes('?')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // Emit completion
      socket.emit("ai-message", {
        type: "complete",
        content: fullResponse,
      });
    } catch (error) {
      console.error("Error processing user message:", error);
      console.error("Error stack:", error.stack);
      
      // Send detailed error to client in development
      const errorMessage =
        error instanceof AppError
          ? error.message
          : process.env.NODE_ENV === "development"
          ? `Failed to process your message: ${error.message}`
          : "Failed to process your message. Please try again.";
      
      socket.emit("error", {
        message: errorMessage,
        type: error.name || "Error",
      });
    }
  });

  /**
   * End interview session
   */
  socket.on("end-interview", async () => {
    try {
      const sessionId = socket.interviewSessionId;

      if (!sessionId) {
        socket.emit("error", {
          message: "No active interview session to end",
        });
        return;
      }

      // Finalize session
      const session = await finalizeInterviewSession(sessionId);

      // Clean up socket session mapping
      socketSessions.delete(socket.id);
      delete socket.interviewSessionId;

      // Emit session ended
      socket.emit("session-ended", {
        sessionId: session._id.toString(),
        status: "completed",
        summary: session.summary,
        message: "Interview session completed successfully",
      });
    } catch (error) {
      console.error("Error ending interview:", error);
      socket.emit("error", {
        message:
          error instanceof AppError
            ? error.message
            : "Failed to end interview session",
      });
    }
  });

  /**
   * Handle disconnect - cleanup session
   */
  socket.on("disconnect", async () => {
    try {
      const sessionId = socket.interviewSessionId;

      if (sessionId) {
        // Cancel the session if it's still active
        await cancelInterviewSession(sessionId);
        socketSessions.delete(socket.id);
        console.log(`Cleaned up interview session ${sessionId} on disconnect`);
      }
    } catch (error) {
      console.error("Error cleaning up session on disconnect:", error);
    }
  });
}

