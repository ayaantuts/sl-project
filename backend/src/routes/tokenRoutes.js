import express from "express";
import { getTokens, createToken, updateStatus, updateToken, deleteToken } from "../controllers/tokenController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router
	.get("/", protect, getTokens)
	.post("/", protect, createToken)
	.patch("/:id", protect, authorize("Moderator", "Admin"), updateStatus)
	.put("/:id", protect, authorize("User"), updateToken)
	.delete("/:id", protect, deleteToken)

export default router;