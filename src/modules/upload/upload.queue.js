import { Queue } from "bullmq";
import { getRedisConnection } from "../../config/redis.js";

// Redis connection configuration (supports Redis Cloud)
const connection = getRedisConnection();

// Create BullMQ queue instance
// This queue only stores job ID references, not full state
export const cvUploadQueue = new Queue("cv-upload", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Helper function to add job to queue
// Job data only contains MongoDB job ID reference
export async function addCVUploadJob(jobId, userId) {
  return await cvUploadQueue.add("process-cv", {
    jobId: jobId.toString(),
    userId: userId.toString(),
  });
}

// Helper function to get job from queue (for reference only)
export async function getQueueJob(bullmqJobId) {
  return await cvUploadQueue.getJob(bullmqJobId);
}

export default cvUploadQueue;
