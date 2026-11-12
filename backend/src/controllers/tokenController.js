import Token from "../models/Token.js";
import Domain from "../models/Domain.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getTokens = asyncHandler(async (req, res) => {
	let filter = {};
	if (req.user.role === "User") {
		filter.userRef = req.user._id;
	}
	else if (req.user.role == "Moderator") {
		const domain = await Domain.findOne({ moderatorRef: req.user._id }).select("_id");
		if (!domain) {
			throw new ApiError(404, "Domain not found");
		}
		filter.domainId = domain._id;
	}
	const tokens = await Token.find(filter);
	return new ApiResponse(200, { tokens }, "Tokens retrieved successfully");
});

export const createToken = asyncHandler(async (req, res) => {
	req.body.userRef = req.user._id;
	const token = await Token.create(req.body);
	return new ApiResponse(201, { token }, "Token created successfully");
});

export const updateStatus = asyncHandler(async (req, res) => {
	const token = await Token.findByIdAndUpdate(
		req.params.id,
		{ status: req.body.status },
		{ new: true }
	);
	if (!token) {
		throw new ApiError(404, "Token not found");
	}
	return new ApiResponse(200, { token }, "Token status updated successfully");
});

export const updateToken = asyncHandler(async (req, res) => {
	req.body.userRef = req.user._id;
	delete req.body.domainId;
	delete req.body.userRef;
	delete req.body.status;
	const token = await Token.findByIdAndUpdate(req.params.id, req.body, { new: true });
	if (!token) {
		throw new ApiError(404, "Token not found");
	}
	return new ApiResponse(200, { token }, "Token updated successfully");
});

export const deleteToken = asyncHandler(async (req, res) => {
	const token = await Token.findByIdAndDelete(req.params.id);
	if (!token) {
		throw new ApiError(404, "Token not found");
	}
	return new ApiResponse(204, {}, "Token deleted successfully");
});
