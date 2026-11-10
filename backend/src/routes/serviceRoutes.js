import express from "express";
import { getServices, createService, updateService, deleteService } from "../controllers/serviceController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router
	.get("/", protect, authorize("Moderator", "Admin"), getServices)
	.post("/", protect, authorize("Admin"), createService)
	.put("/:id", protect, authorize("Admin"), updateService)
	.delete("/:id", protect,  authorize("Admin"), deleteService)

export default router;