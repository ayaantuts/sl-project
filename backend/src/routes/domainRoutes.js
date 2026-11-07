import express from "express";
import { getDomains, createDomain, updateDomain, deleteDomain } from "../controllers/domainController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router
	.get("/", protect, authorize("Moderator", "Admin"), getDomains)
	.post("/", protect, authorize("Admin"), createDomain)
	.put("/:id", protect, authorize("Admin"), updateDomain)
	.delete("/:id", protect,  authorize("Admin"), deleteDomain)

export default router;