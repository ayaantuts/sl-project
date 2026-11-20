import express from "express";
import {
  getTokens,
  getMyTokens,
  trackToken,
  createToken,
  cancelToken,
  rejoinQueue,
  checkInToken,
  requestServiceChange,
  getTokenEvents,
  markTokenArrived,
  completeToken,
  transferToken,
  markTokenNoShow,
  setTokenPriority,
  deleteToken,
} from "../controllers/tokenController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Public tracking route (no login required)
router.get("/track/:ticketNumber", trackToken);

// Citizen collection & creation routes
router.get("/mine", protect, getMyTokens);
router.get("/", protect, getTokens);
router.post("/", protect, createToken);

// Citizen token lifecycle routes
router.patch("/:id/cancel", protect, cancelToken);
router.patch("/:id/rejoin", protect, rejoinQueue);
router.patch("/:id/check-in", protect, checkInToken);
router.post("/:id/service-change", protect, requestServiceChange);
router.get("/:id/events", protect, getTokenEvents);

// Staff / Counter token actions
router.patch("/:id/arrived", protect, authorize("Moderator", "Admin"), markTokenArrived);
router.patch("/:id/complete", protect, authorize("Moderator", "Admin"), completeToken);
router.patch("/:id/transfer", protect, authorize("Moderator", "Admin"), transferToken);
router.patch("/:id/no-show", protect, authorize("Moderator", "Admin"), markTokenNoShow);
router.patch("/:id/priority", protect, authorize("Moderator", "Admin"), setTokenPriority);

router.delete("/:id", protect, authorize("Moderator", "Admin"), deleteToken);

export default router;