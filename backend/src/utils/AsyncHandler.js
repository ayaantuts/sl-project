const asyncHandler = (requestHandler) => {
	return (req, res, next) => {
		Promise.resolve(requestHandler(req, res, next)).catch((err) => {
			// console.error(err);
			res.status(err.statusCode || 500).json({
				success: false,
				message: err.message || "Internal Server Error",
			});
		})
	}
}

export default asyncHandler;