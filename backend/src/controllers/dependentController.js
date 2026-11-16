import Dependent from "../models/Dependent.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getDependents = asyncHandler(async (req, res) => {
  const dependents = await Dependent.find({ guardianRef: req.user._id }).sort({
    createdAt: 1,
  });
  return new ApiResponse(200, { dependents }, "Dependents retrieved successfully");
});

export const createDependent = asyncHandler(async (req, res) => {
  const { name, relation, age, isVulnerable } = req.body;
  if (!name || !relation) {
    throw new ApiError(400, "name and relation are required");
  }

  const dependent = await Dependent.create({
    guardianRef: req.user._id,
    name,
    relation,
    age: age !== undefined && age !== "" ? Number(age) : undefined,
    isVulnerable: Boolean(isVulnerable),
  });

  return new ApiResponse(201, { dependent }, "Dependent added successfully");
});

export const deleteDependent = asyncHandler(async (req, res) => {
  const dependent = await Dependent.findOneAndDelete({
    _id: req.params.id,
    guardianRef: req.user._id,
  });

  if (!dependent) {
    throw new ApiError(404, "Dependent not found");
  }

  return new ApiResponse(204, {}, "Dependent removed successfully");
});