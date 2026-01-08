import { Router } from "express";
import { uploadMemory } from "../../middleware/upload.middleware.js";
import {
  uploadDocument,
  getJobStatus,
  getCurrentDocument,
} from "./upload.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();

// Upload CV
router.post("/", protect, uploadMemory, uploadDocument);

// Get job status
router.get("/status/:jobId", protect, getJobStatus);

// Get current user's CV document data
router.get("/document", protect, getCurrentDocument);

export default router;
