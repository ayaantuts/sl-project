import Domain from "../models/Domain.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getDomains = asyncHandler(async (req, res) => {
	let filter = {};
	if (req.user.role == "Moderator") {
		filter.moderatorRef = req.user._id;
	}
	const domains = await Domain.find(filter);
	return res.json(new ApiResponse(200, { domains }, "Domains retrieved successfully"));
});

export const createDomain = asyncHandler(async (req, res) => {
	const domain = await Domain.create(req.body);
	return res.json(new ApiResponse(201, { domain }, "Domain created successfully"));
});

export const updateDomain = asyncHandler(async (req, res) => {
	const domain = await Domain.findByIdAndUpdate(req.params.id, req.body, { new: true });
	if (!domain) {
		throw new ApiError(404, "Domain not found");
	}
	return res.json(new ApiResponse(200, { domain }, "Domain updated successfully"));
});

export const deleteDomain = asyncHandler(async (req, res) => {
	const domain = await Domain.findByIdAndDelete(req.params.id);
	if (!domain) {
		throw new ApiError(404, "Domain not found");
	}
	return res.json(new ApiResponse(204, {}, "Domain deleted successfully"));
});
