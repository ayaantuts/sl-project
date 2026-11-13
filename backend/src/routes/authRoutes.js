import express from "express";
import { registerUser, loginUser, logoutUser, getMe } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router
	.post("/login", loginUser)
	.post("/register", registerUser)
	.post("/logout", protect, logoutUser)
	.get("/me", protect, getMe)

export default router;