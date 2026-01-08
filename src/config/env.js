import dotenv from "dotenv";
dotenv.config();

export const config = {
  openai_key: process.env.OPENAI_API_KEY,
  pinecone_api_key: process.env.PINECONE_API_KEY,
  pinecone_index_name: process.env.PINECONE_INDEX_NAME || "cvs",
  // pinecone_environment: process.env.PINECONE_ENVIRONMENT, // Optional, for older Pinecone accounts
  jwt_secret: process.env.JWT_SECRET,
  jwt_expires_in: process.env.JWT_EXPIRES_IN || "90d",
  jwt_cookie_expires_in: process.env.JWT_COOKIE_EXPIRES_IN || 90,
  node_env: process.env.NODE_ENV || "development",
  redis: {
    // Redis Cloud support: Use REDIS_URL if provided (for Redis Cloud)
    // Format: redis://username:password@host:port or rediss://username:password@host:port (for TLS)
    url: process.env.REDIS_URL,
    // Or use individual connection parameters
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    // TLS/SSL support for Redis Cloud
    tls: process.env.REDIS_TLS === "true" || process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
  },
};
