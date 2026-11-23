import Token from "../models/Token.js";
import Domain from "../models/Domain.js";
import Service from "../models/Service.js";
import Dependent from "../models/Dependent.js";
import QueueEvent from "../models/QueueEvent.js";
import ServiceChangeRequest from "../models/ServiceChangeRequest.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import {
  computePriorityScore,
  generateTicketNumber,
  snapshotServicePositions,
  recordPositionShifts,
  enrichTokenViews,
} from "../utils/queueEngine.js";
import { emitQueueUpdated, emitTokenUpdated } from "../sockets/index.js";

const REJOIN_LIMIT = 2;

const updateWorkflowStep = async (token, stepData) => {
  const now = new Date();
  let lastStep = token.workflowHistory[token.workflowHistory.length - 1];
  if (!lastStep.completedAt) {
    lastStep.completedAt = now;
    lastStep.status = stepData.status || lastStep.status;
    lastStep.notes = stepData.notes || lastStep.notes;
    token.workflowHistory[token.workflowHistory.length - 1] = lastStep;
  }
  token.workflowHistory.push({
    serviceId: stepData.serviceId,
    serviceName: stepData.serviceName || lastStep.serviceName || "Unknown",
    counterId: stepData.counterId || "Counter 1",
    status: stepData.status || "WAITING",
    startedAt: now,
    completedAt: null,
    notes: stepData.notes || "",
  });
  await token.save();
}

export const getTokens = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "User") {
    filter.userRef = req.user._id;
  } else if (req.user.role === "Moderator") {
    const domains = await Domain.find({ moderatorRef: req.user._id }).select("_id");
    filter.domainId = { $in: domains.map((d) => d._id) };
  }

  const rawTokens = await Token.find(filter).sort({ createdAt: -1 });
  const tokens = await enrichTokenViews(rawTokens);
  return new ApiResponse(200, { tokens }, "Tokens retrieved successfully");
});

export const getMyTokens = asyncHandler(async (req, res) => {
  const rawTokens = await Token.find({ userRef: req.user._id }).sort({ createdAt: -1 });
  const tokens = await enrichTokenViews(rawTokens);
  return new ApiResponse(200, { tokens }, "My tokens retrieved successfully");
});

export const trackToken = asyncHandler(async (req, res) => {
  const ticketNumber = req.params.ticketNumber?.trim().toUpperCase();
  if (!ticketNumber) {
    throw new ApiError(400, "Ticket number is required");
  }

  const rawToken = await Token.findOne({ ticketNumber }).sort({ createdAt: -1 });
  if (!rawToken) {
    throw new ApiError(404, "Ticket not found");
  }

  const [token] = await enrichTokenViews([rawToken]);
  return new ApiResponse(200, { token }, "Token retrieved successfully");
});

export const createToken = asyncHandler(async (req, res) => {
  const {
    domainId,
    currentServiceId,
    groupSize = 1,
    scheduledSlot,
    priorityTier,
    dependentId,
    ticketNumber: explicitTicketNumber,
  } = req.body;

  if (!domainId || !currentServiceId) {
    throw new ApiError(400, "domainId and currentServiceId are required");
  }

  const [domain, service] = await Promise.all([
    Domain.findById(domainId),
    Service.findById(currentServiceId),
  ]);

  if (!domain) throw new ApiError(404, "Domain not found");
  if (!service) throw new ApiError(404, "Service not found");

  const parsedGroupSize = Number(groupSize) || 1;
  if (parsedGroupSize > 1 && !domain.settings?.allowGroupBooking) {
    throw new ApiError(400, "Group booking is disabled for this domain");
  }
  const maxGroup = domain.settings?.maxGroupSize || 5;
  if (parsedGroupSize < 1 || parsedGroupSize > maxGroup) {
    throw new ApiError(400, `Group size must be between 1 and ${maxGroup}`);
  }

  let holderName = req.user.name || "Citizen";
  let resolvedTier = Number(priorityTier || 0);

  // Citizens can self-declare up to tier 2 (Vulnerable); tier 3 (Emergency) is staff-only
  if (req.user.role === "User" && resolvedTier > 2) {
    resolvedTier = 2;
  }

  if (dependentId) {
    const dep = await Dependent.findOne({ _id: dependentId, guardianRef: req.user._id });
    if (!dep) throw new ApiError(404, "Dependent not found");
    holderName = dep.name;
    if (dep.isVulnerable && resolvedTier < 2) {
      resolvedTier = 2;
    }
  }

  const isScheduled = Boolean(scheduledSlot?.startTime);
  if (isScheduled && resolvedTier === 0) {
    resolvedTier = 1;
  }

  const beforeMap = await snapshotServicePositions(currentServiceId);
  const ticketNumber =
    explicitTicketNumber || (await generateTicketNumber(domainId, service));
  const now = new Date();

  const created = await Token.create({
    domainId,
    currentServiceId,
    ticketNumber,
    userRef: req.user._id,
    groupSize: parsedGroupSize,
    status: "WAITING",
    priorityTier: resolvedTier,
    scheduledSlot: isScheduled ? scheduledSlot : undefined,
    queuedAt: now,
    dependentId: dependentId || null,
    holderName,
    workflowHistory: [{
        serviceId: currentServiceId,
        serviceName: service.name || "Unknown",
        status: "WAITING",
        startedAt: now,
        completedAt: null,
      }],
  });

  created.priorityScore = computePriorityScore(created, now);
  await created.save();

  service.waitingCount = await Token.countDocuments({ currentServiceId, status: "WAITING" });
  await service.save();

  if (resolvedTier >= 2 && !isScheduled) {
    await recordPositionShifts({
      serviceId: currentServiceId,
      domainId,
      beforeMap,
      causeType: "PRIORITY_JOIN",
      excludeTokenId: created._id,
    });
  }

  emitQueueUpdated({ domainId: String(domainId), serviceId: String(currentServiceId) });
  emitTokenUpdated({
    tokenId: String(created._id),
    domainId: String(domainId),
    status: created.status,
  });

  const [token] = await enrichTokenViews([created]);
  return new ApiResponse(201, { token }, "Token created successfully");
});

export const cancelToken = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  if (req.user.role === "User" && String(doc.userRef) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to cancel this token");
  }
  
  doc.status = "CANCELLED";
  await updateWorkflowStep(doc, { status: "CANCELLED", notes: "Cancelled by user" });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token cancelled successfully");
});

export const rejoinQueue = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  if (req.user.role === "User" && String(doc.userRef) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to rejoin this token");
  }

  if (doc.status !== "MISSED") {
    throw new ApiError(400, "Only missed tokens can rejoin the queue");
  }

  if ((doc.rejoinCount || 0) >= REJOIN_LIMIT) {
    throw new ApiError(400, `Maximum rejoin limit (${REJOIN_LIMIT}) reached`);
  }

  const now = new Date();
  doc.status = "WAITING";
  doc.queuedAt = now;
  doc.rejoinCount = (doc.rejoinCount || 0) + 1;
  if (doc.priorityTier === 1) {
    doc.priorityTier = 0;
  }
  doc.priorityScore = computePriorityScore(doc, now);
  await updateWorkflowStep(doc, { status: "WAITING", notes: `Rejoined queue (#${doc.rejoinCount})` });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Rejoined queue successfully");
});

export const checkInToken = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  if (req.user.role === "User" && String(doc.userRef) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to check in this token");
  }

  if (!doc.scheduledSlot?.startTime) {
    throw new ApiError(400, "This token is not a scheduled booking");
  }

  const beforeMap = await snapshotServicePositions(doc.currentServiceId);
  const now = new Date();
  doc.checkedInAt = now;
  doc.priorityScore = computePriorityScore(doc, now);
  await doc.save();

  await recordPositionShifts({
    serviceId: doc.currentServiceId,
    domainId: doc.domainId,
    beforeMap,
    causeType: "SCHEDULED_ARRIVAL",
    excludeTokenId: doc._id,
  });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Checked in successfully");
});

export const requestServiceChange = asyncHandler(async (req, res) => {
  const { toServiceId, reason } = req.body;
  if (!toServiceId) {
    throw new ApiError(400, "toServiceId is required");
  }

  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  if (req.user.role === "User" && String(doc.userRef) !== String(req.user._id)) {
    throw new ApiError(403, "Not authorized to request a service change for this token");
  }

  const targetService = await Service.findById(toServiceId);
  if (!targetService) throw new ApiError(404, "Target service not found");

  const existingPending = await ServiceChangeRequest.findOne({
    tokenId: doc._id,
    status: "PENDING",
  });
  if (existingPending) {
    throw new ApiError(409, "A service change request is already pending for this token");
  }

  const request = await ServiceChangeRequest.create({
    tokenId: doc._id,
    domainId: doc.domainId,
    fromServiceId: doc.currentServiceId,
    toServiceId,
    reason: reason || "",
  });

  await updateWorkflowStep(doc, { status: "PENDING", notes: reason || "" });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  return new ApiResponse(201, { request }, "Service change requested");
});

export const getTokenEvents = asyncHandler(async (req, res) => {
  const events = await QueueEvent.find({ tokenId: req.params.id }).sort({ createdAt: -1 });
  return new ApiResponse(200, { events }, "Token events retrieved successfully");
});

// --- Staff / Counter Operations ---

export const markTokenArrived = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  const now = new Date();
  doc.status = "IN_SERVICE";
  doc.serviceStartedAt = now;

  await updateWorkflowStep(doc, { status: "IN_SERVICE", notes: "Token marked as arrived" });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token marked as arrived");
});

export const completeToken = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  doc.status = "COMPLETED";
  await updateWorkflowStep(doc, { status: "COMPLETED", notes: "Token completed" });  

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token completed successfully");
});

export const transferToken = asyncHandler(async (req, res) => {
  const { nextServiceId, notes } = req.body;
  if (!nextServiceId) {
    throw new ApiError(400, "nextServiceId is required");
  }

  const [doc, nextService] = await Promise.all([
    Token.findById(req.params.id),
    Service.findById(nextServiceId),
  ]);

  if (!doc) throw new ApiError(404, "Token not found");
  if (!nextService) throw new ApiError(404, "Destination service not found");

  const prevServiceId = doc.currentServiceId;
  const beforeMap = await snapshotServicePositions(nextServiceId);
  const now = new Date();

  // Grant 20 minutes of queue credit on inter-counter transfer
  const creditedQueueTime = new Date(now.getTime() - 20 * 60 * 1000);

  doc.currentServiceId = nextServiceId;
  doc.status = "WAITING";
  doc.serviceStartedAt = null;
  doc.queuedAt = creditedQueueTime;
  doc.priorityScore = computePriorityScore(doc, now);
  await updateWorkflowStep(doc, { serviceId: nextServiceId, service: nextService.name, status: "WAITING", notes: notes || "" });

  await recordPositionShifts({
    serviceId: nextServiceId,
    domainId: doc.domainId,
    beforeMap,
    causeType: "SERVICE_CHANGE",
    excludeTokenId: doc._id,
  });

  const waitingCount = await Token.countDocuments({ currentServiceId: nextServiceId, status: "WAITING" });
  if (nextService.waitingCount !== waitingCount) {
    nextService.waitingCount = waitingCount;
    await nextService.save();
  }

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(prevServiceId) });
  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(nextServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token transferred successfully");
});

export const markTokenNoShow = asyncHandler(async (req, res) => {
  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  const now = new Date();
  doc.status = "MISSED";

  await updateWorkflowStep(doc, { status: "MISSED", notes: "Token marked as no-show" });

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token marked as no-show");
});

export const setTokenPriority = asyncHandler(async (req, res) => {
  const { priorityTier, reason } = req.body;
  const tier = Number(priorityTier);

  if (Number.isNaN(tier) || tier < 0 || tier > 3) {
    throw new ApiError(400, "priorityTier must be between 0 and 3");
  }

  if (tier === 3 && (!reason || !String(reason).trim())) {
    throw new ApiError(400, "A reason is required for emergency priority overrides");
  }

  const doc = await Token.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Token not found");

  const prevTier = doc.priorityTier;
  const beforeMap = await snapshotServicePositions(doc.currentServiceId);
  const now = new Date();

  doc.priorityTier = tier;
  doc.priorityScore = computePriorityScore(doc, now);
  if (reason) {
    const lastStep = doc.workflowHistory[doc.workflowHistory.length - 1];
    if (lastStep) lastStep.notes = reason;
  }
  await doc.save();

  if (tier > prevTier && doc.status === "WAITING") {
    await recordPositionShifts({
      serviceId: doc.currentServiceId,
      domainId: doc.domainId,
      beforeMap,
      causeType: tier === 3 ? "EMERGENCY_OVERRIDE" : "VULNERABLE_BOOST",
      excludeTokenId: doc._id,
    });
  }

  emitQueueUpdated({ domainId: String(doc.domainId), serviceId: String(doc.currentServiceId) });
  emitTokenUpdated({ tokenId: String(doc._id), domainId: String(doc.domainId), status: doc.status });

  const [token] = await enrichTokenViews([doc]);
  return new ApiResponse(200, { token }, "Token priority updated");
});

export const deleteToken = asyncHandler(async (req, res) => {
  // await Promise.all([
  //   Token.deleteMany({}),
  //   QueueEvent.deleteMany({}),
  //   ServiceChangeRequest.deleteMany({}),
  // ]);
  // return new ApiResponse(204, {}, "All tokens deleted successfully");
  const token = await Token.findById(req.params.id);
  if (!token) {
    throw new ApiError(404, "Token not found");
  }

  // Ensure Moderators can only delete tokens within domains they own
  if (req.user.role === "Moderator") {
    const domain = await Domain.findById(token.domainId).select("moderatorRef");
    if (!domain || String(domain.moderatorRef) !== String(req.user._id)) {
      throw new ApiError(403, "Not authorized to delete tokens in this domain");
    }
  }

  await Promise.all([
    Token.findByIdAndDelete(token._id),
    QueueEvent.deleteMany({ tokenId: token._id }),
    ServiceChangeRequest.deleteMany({ tokenId: token._id }),
  ]);

  emitQueueUpdated({
    domainId: String(token.domainId),
    serviceId: String(token.currentServiceId),
  });

  return new ApiResponse(204, {}, "Token deleted successfully");
});