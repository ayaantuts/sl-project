import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getUsers = asyncHandler(async (req, res) => {
	const users = await User.find({});

	return res.json(new ApiResponse(200, { users }, "Users retrieved successfully"));
});

export const deleteUser = asyncHandler(async (req, res) => {
	const user = await User.findByIdAndDelete(req.params.id);

	if (!user) {
		throw new ApiError(404, "User not found");
	}

	return res.json(new ApiResponse(204, {}, "User deleted successfully"));
});