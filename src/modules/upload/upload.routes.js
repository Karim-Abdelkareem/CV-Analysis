import { Router } from "express";
import { uploadMemory } from "../../middleware/upload.middleware.js";
import { uploadDocument } from "./upload.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();
router.post("/", protect, uploadMemory, uploadDocument);
export default router;
