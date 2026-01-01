import { Router } from "express";
import { queryVector } from "./vector.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();
router.get("/", protect, queryVector);
export default router;
