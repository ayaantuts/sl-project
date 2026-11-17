import ServiceChangeRequest from "../models/ServiceChangeRequest.js";
import Token from "../models/Token.js";
import Service from "../models/Service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import {
  computePriorityScore,
  snapshotServicePositions,
  recordPositionShifts,
} from "../utils/queueEngine.js";
import { emitQueueUpdated, emitTokenUpdated } from "../sockets/index.js";

export const getDomainServiceChangeRequests = asyncHandler(async (req, res) => {
  const { domainId } = req.params;
  const requests = await ServiceChangeRequest.find({
    domainId,
    status: "PENDING",
  })
    .populate("tokenId", "ticketNumber holderName status priorityTier")
    .populate("fromServiceId", "name prefix")
    .populate("toServiceId", "name prefix")
    .sort({ createdAt: 1 });

  return new ApiResponse(
    200,
    { requests },
    "Pending service change requests retrieved"
  );
});

export const decideServiceChangeRequest = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (!["APPROVED", "REJECTED"].includes(decision)) {
    throw new ApiError(400, "decision must be APPROVED or REJECTED");
  }

  const request = await ServiceChangeRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, "Service change request not found");

  if (request.status !== "PENDING") {
    throw new ApiError(400, "This request has already been decided");
  }

  const now = new Date();
  request.status = decision;
  request.decidedAt = now;
  await request.save();

  const token = await Token.findById(request.tokenId);
  if (token && decision === "APPROVED") {
    const targetService = await Service.findById(request.toServiceId);
    if (!targetService) throw new ApiError(404, "Target service no longer exists");

    const oldServiceId = token.currentServiceId;
    const beforeMap = await snapshotServicePositions(request.toServiceId);

    // Close current step and move token to new service while keeping original queuedAt
    const lastStep = token.workflowHistory[token.workflowHistory.length - 1];
    if (lastStep && !lastStep.completedAt) {
      lastStep.status = "TRANSFERRED";
      lastStep.completedAt = now;
      lastStep.notes = `Service switched to ${targetService.name}`;
    }

    token.currentServiceId = request.toServiceId;
    token.status = "WAITING";
    token.serviceStartedAt = null;
    token.priorityScore = computePriorityScore(token, now);
    token.workflowHistory.push({
      serviceId: request.toServiceId,
      status: "WAITING",
      startedAt: now,
      completedAt: null,
      notes: "Approved service switch",
    });

    await token.save();

    await recordPositionShifts({
      serviceId: request.toServiceId,
      domainId: token.domainId,
      beforeMap,
      causeType: "SERVICE_CHANGE",
      excludeTokenId: token._id,
    });

    emitQueueUpdated({
      domainId: String(token.domainId),
      serviceId: String(oldServiceId),
    });
    emitQueueUpdated({
      domainId: String(token.domainId),
      serviceId: String(request.toServiceId),
    });
    emitTokenUpdated({
      tokenId: String(token._id),
      domainId: String(token.domainId),
      status: token.status,
    });
  } else if (token) {
    emitTokenUpdated({
      tokenId: String(token._id),
      domainId: String(token.domainId),
      status: token.status,
    });
  }

  return new ApiResponse(200, { request }, `Service change ${decision.toLowerCase()}`);
});