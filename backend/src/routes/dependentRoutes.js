import express from "express";
import {
  getDependents,
  createDependent,
  deleteDependent,
} from "../controllers/dependentController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router
  .get("/", protect, getDependents)
  .post("/", protect, createDependent)
  .delete("/:id", protect, deleteDependent);

export default router;