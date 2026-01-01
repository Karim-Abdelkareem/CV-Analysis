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
  livekit: {
    url: process.env.LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    secret: process.env.LIVEKIT_API_SECRET,
  },
};
