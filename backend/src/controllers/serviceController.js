import Service from "../models/Service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getServices = asyncHandler(async (req, res) => {
	let filter = {};
	if (req.user.role == "Moderator") {
		filter.moderatorRef = req.user._id;
	}
	const services = await Service.find(filter);
	return new ApiResponse(200, { services }, "Services retrieved successfully");
});

export const createService = asyncHandler(async (req, res) => {
	const service = await Service.create(req.body);
	return new ApiResponse(201, { service }, "Service created successfully");
});

export const updateService = asyncHandler(async (req, res) => {
	const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
	if (!service) {
		throw new ApiError(404, "Service not found");
	}
	return new ApiResponse(200, { service }, "Service updated successfully");
});

export const deleteService = asyncHandler(async (req, res) => {
	const service = await Service.findByIdAndDelete(req.params.id);
	if (!service) {
		throw new ApiError(404, "Service not found");
	}
	return new ApiResponse(204, {}, "Service deleted successfully");
});
