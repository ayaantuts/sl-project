import express from "express";
import { getDomainAnalytics, getAllDomainsAnalytics } from "../controllers/analyticsController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get(
  "/all",
  protect,
  authorize("Moderator","Admin"),
  getAllDomainsAnalytics
);

router.get(
  "/:domainId",
  protect,
  authorize("Moderator", "Admin"),
  getDomainAnalytics
);

export default router;