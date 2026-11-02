import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
  };
  const token = user.getSignedJwtToken();

  return res.json(new ApiResponse(200, { user: userData, token }, "User logged in successfully"));
});

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required");
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "User",
  });

  const matchedUser = await User.findOne({ email });
  matchedUser.token = user.getSignedJwtToken();

  return res.json(new ApiResponse(201, { user: matchedUser }, "User registered successfully"));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.json(new ApiResponse(200, { user }, "User retrieved successfully"));
});