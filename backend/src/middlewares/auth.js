import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/AsyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		try {
			token = req.headers.authorization.split(' ')[1];

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = await User.findById(decoded.id).select('-password');

			return next();
		} catch (error) {
			throw new ApiError(401, 'Not authorized, token failed');
		}
	}

	if (!token) {
		throw new ApiError(401, 'Not authorized, no token');
	}
});

export const authorize = (...roles) => {
	return asyncHandler(async (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			throw new ApiError(403, `User role '${req.user.role}' is not authorized to access this route`);
		}
		next();
	});
};