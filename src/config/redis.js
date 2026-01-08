import { config } from "./env.js";

/**
 * Get Redis connection configuration
 * Supports both local Redis and Redis Cloud
 */
export function getRedisConnection() {
  // If REDIS_URL is provided (Redis Cloud), use it
  if (config.redis.url) {
    return {
      url: config.redis.url,
    };
  }

  // Otherwise, use individual connection parameters
  const connection = {
    host: config.redis.host,
    port: config.redis.port,
  };

  // Add username if provided (Redis Cloud often requires username)
  if (config.redis.username) {
    connection.username = config.redis.username;
  }

  // Add password if provided
  if (config.redis.password) {
    connection.password = config.redis.password;
  }

  // Add TLS if enabled (Redis Cloud often requires TLS)
  if (config.redis.tls) {
    connection.tls = config.redis.tls;
  }

  return connection;
}

export default getRedisConnection;

