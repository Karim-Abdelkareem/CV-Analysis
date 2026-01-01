import { Router } from "express";
import { ask } from "./rag.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();
router.post("/", protect, ask);
export default router;
