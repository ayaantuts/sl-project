import express from "express";
import {
  getDomainServiceChangeRequests,
  decideServiceChangeRequest,
} from "../controllers/serviceChangeController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get(
  "/:domainId",
  protect,
  authorize("Moderator", "Admin"),
  getDomainServiceChangeRequests
);
router.patch(
  "/:id",
  protect,
  authorize("Moderator", "Admin"),
  decideServiceChangeRequest
);

export default router;