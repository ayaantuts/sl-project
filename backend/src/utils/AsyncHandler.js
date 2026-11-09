const asyncHandler = (requestHandler) => {
	return (req, res, next) => {
		Promise.resolve(requestHandler(req, res, next))
			.then((response) => {
				if (!response) return;
				return res.status(response?.statusCode || 200).json(response);
			})
			.catch(next);
	}
}

export default asyncHandler;