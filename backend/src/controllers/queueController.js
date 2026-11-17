import Token from "../models/Token.js";
import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import {
  getOrderedWaitingTokens,
  isTokenDispatchable,
  enrichTokenViews,
} from "../utils/queueEngine.js";
import { emitQueueUpdated, emitTokenUpdated } from "../sockets/index.js";

export const getServiceQueue = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");
  const waitingCount = await Token.countDocuments({ currentServiceId: serviceId, status: "WAITING" });
  if (service.waitingCount !== waitingCount) {
    service.waitingCount = waitingCount;
    await service.save();
  }

  const now = new Date();
  const [orderedWaiting, allWaiting, rawServing] = await Promise.all([
    getOrderedWaitingTokens(serviceId, now),
    Token.find({ currentServiceId: serviceId, status: "WAITING" }),
    Token.find({ currentServiceId: serviceId, status: "IN_SERVICE" }).sort({
      serviceStartedAt: 1,
    }),
  ]);

  // Scheduled tokens waiting for check-in or future slot start time
  const rawUpcoming = allWaiting
    .filter((t) => !isTokenDispatchable(t, now))
    .sort(
      (a, b) =>
        new Date(a.scheduledSlot?.startTime || a.createdAt) -
        new Date(b.scheduledSlot?.startTime || b.createdAt)
    );

  const [waiting, upcoming, serving] = await Promise.all([
    enrichTokenViews(orderedWaiting),
    enrichTokenViews(rawUpcoming),
    enrichTokenViews(rawServing),
  ]);

  return new ApiResponse(
    200,
    { waiting, upcoming, serving, service },
    "Service queue retrieved successfully"
  );
});

export const callNextToken = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { counterId } = req.body;

  if (!counterId || !String(counterId).trim()) {
    throw new ApiError(400, "counterId is required");
  }

  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");

  const orderedWaiting = await getOrderedWaitingTokens(serviceId);
  if (orderedWaiting.length === 0) {
    throw new ApiError(404, "No dispatchable tokens waiting in queue");
  }

  const nextDoc = orderedWaiting[0];
  const now = new Date();

  nextDoc.status = "IN_SERVICE";
  nextDoc.serviceStartedAt = now;

  const lastStep = nextDoc.currentWorkflowStep || nextDoc.workflowHistory[nextDoc.workflowHistory.length - 1];
  if (lastStep) {
    lastStep.counterId = String(counterId).trim();
    lastStep.status = "CALLED";
    lastStep.startedAt = now;
  }

  await nextDoc.save();

  emitQueueUpdated({
    domainId: String(nextDoc.domainId),
    serviceId: String(serviceId),
  });
  emitTokenUpdated({
    tokenId: String(nextDoc._id),
    domainId: String(nextDoc.domainId),
    status: nextDoc.status,
  });

  const [token] = await enrichTokenViews([nextDoc]);
  return new ApiResponse(200, { token }, "Next token called successfully");
});

export const getDisplayBoard = asyncHandler(async (req, res) => {
  const { domainId } = req.params;
  const domain = await Domain.findById(domainId);
  if (!domain) throw new ApiError(404, "Domain not found");

  const services = await Service.find({ domainId, isActive: true }).sort({
    createdAt: 1,
  });

  const serviceBoards = await Promise.all(
    services.map(async (service) => {
      const [rawServing, orderedWaiting] = await Promise.all([
        Token.find({ currentServiceId: service._id, status: "IN_SERVICE" }).sort({
          serviceStartedAt: -1,
        }),
        getOrderedWaitingTokens(service._id),
      ]);

      const [serving, next] = await Promise.all([
        enrichTokenViews(rawServing),
        enrichTokenViews(orderedWaiting.slice(0, 5)),
      ]);

      return { service, serving, next };
    })
  );

  return new ApiResponse(
    200,
    { domain, services: serviceBoards },
    "Display board retrieved successfully"
  );
});