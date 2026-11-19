import express from "express";
import { getAllServices, getServices, createService, updateService, deleteService } from "../controllers/serviceController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router
	.get("/", protect, authorize("Moderator", "Admin"), getAllServices)
	.get("/:domainId", protect, getServices)
	.post("/", protect, authorize("Moderator", "Admin"), createService)
	.put("/:id", protect, authorize("Moderator", "Admin"), updateService)
	.delete("/:id", protect,  authorize("Moderator", "Admin"), deleteService)

export default router;