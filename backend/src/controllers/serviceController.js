import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import Token from "../models/Token.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

const validateAccess = async (domainId, user) => {
	if (user.role === "Admin") return true;
	if (user.role === "Moderator") {
		const domain = await Domain.findById(domainId);
		if (!domain) throw new ApiError(403, "You do not have access to this domain");
		if (domain.moderatorRef.toString() !== user._id.toString())
			throw new ApiError(403, "You do not have access to this domain");
		return true;
	}
	throw new ApiError(403, "You do not have access to this domain");
}

export const getAllServices = asyncHandler(async (req, res) => {
	let filter = {};
	if (req.user.role === "Moderator") {
		const moderatorDomains = await Domain.find({ moderatorRef: req.user._id });
		const domainIds = moderatorDomains.map(domain => domain._id);
		filter.domainId = { $in: domainIds };
	}
	const services = await Service.find(filter);
	return new ApiResponse(200, { services }, "All services retrieved successfully");
});

export const getServices = asyncHandler(async (req, res) => {
	let filter = {};
	const domainId = req.params.domainId;
	if (!domainId)
		throw new ApiError(400, "Domain ID is required");
	filter.domainId = domainId;
	const services = await Service.find(filter);
	return new ApiResponse(200, { services }, "Services retrieved successfully");
});

export const createService = asyncHandler(async (req, res) => {
	const { domainId, name, prefix, avgHandleTimeMins, isActive } = req.body;
	if (!domainId || !name || !prefix) {
		throw new ApiError(400, "domainId, name, and prefix are required");
	}

	await validateAccess(domainId, req.user);
	const order = await Service.countDocuments({ domainId }) + 1;

	const service = await Service.create({
		domainId,
		name,
		prefix: prefix.toUpperCase(),
		avgHandleTimeMins: avgHandleTimeMins ?? 5,
		isActive: isActive ?? true,
		order
	});
	return new ApiResponse(201, { service }, "Service created successfully");
});

export const updateService = asyncHandler(async (req, res) => {
	const serviceId = req.params.id;
	if (!serviceId) {
		throw new ApiError(400, "Service ID is required");
	}

	const serviceToUpdate = await Service.findById(serviceId);
	if (!serviceToUpdate) {
		throw new ApiError(404, "Service not found");
	}

	await validateAccess(serviceToUpdate.domainId, req.user);

	const service = await Service.findByIdAndUpdate(serviceId, req.body, { new: true, runValidators: true });
	if (!service) {
		throw new ApiError(404, "Service not found");
	}
	return new ApiResponse(200, { service }, "Service updated successfully");
});

export const deleteService = asyncHandler(async (req, res) => {
	const serviceId = req.params.id;
	if (!serviceId) {
		throw new ApiError(400, "Service ID is required");
	}

	await validateAccess(req.body.domainId, req.user);

	const service = await Service.findByIdAndDelete(serviceId);
	if (!service) {
		throw new ApiError(404, "Service not found");
	}
	await Promise.all([
		Service.findByIdAndDelete(req.params.id),
		Token.deleteMany({ currentServiceId: req.params.id }),
	]);
	return new ApiResponse(204, {}, "Service deleted successfully");
});
