import express from "express";
import {
  getServiceQueue,
  callNextToken,
  getDisplayBoard,
} from "../controllers/queueController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/display/:domainId", protect, getDisplayBoard);
router.get("/:serviceId", protect, authorize("Moderator", "Admin"), getServiceQueue);
router.post("/:serviceId/call-next", protect, authorize("Moderator", "Admin"), callNextToken);

export default router;