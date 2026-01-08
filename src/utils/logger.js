import pino from "pino";

/**
 * Structured Logger using Pino
 * Provides contextual logging with sessionId, socketId, etc.
 */

const isDevelopment = process.env.NODE_ENV === "development";

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

/**
 * Create child logger with context
 * @param {Object} context - Context object (sessionId, socketId, userId, etc.)
 * @returns {Object} Child logger instance
 */
export function createLogger(context = {}) {
  return logger.child(context);
}

/**
 * Default logger instance
 */
export default logger;

