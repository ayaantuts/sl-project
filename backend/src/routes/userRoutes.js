import express from "express";
import { getUsers, deleteUser } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router
	.get("/", protect, authorize("Admin"), getUsers)
	.delete("/:id", protect, authorize("Admin"), deleteUser)

export default router;