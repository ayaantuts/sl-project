import Token from "../models/Token.js";
import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import QueueEvent from "../models/QueueEvent.js";
import ServiceChangeRequest from "../models/ServiceChangeRequest.js";
import { emitTokenShifted } from "../sockets/index.js";

const COUNTERS_PER_SERVICE = 4;

const CAUSE_LABELS = {
  EMERGENCY_OVERRIDE: "Emergency Override",
  VULNERABLE_BOOST: "Senior Citizen / Vulnerable call",
  SCHEDULED_ARRIVAL: "Scheduled Arrival",
  PRIORITY_JOIN: "Priority Assistance arrival",
  SERVICE_CHANGE: "Approved Service Transfer",
};

/**
 * Computes fair anti-starvation priority score:
 * - Tier 3 (Emergency): always ahead of non-emergencies
 * - Tier 2 (Vulnerable): +45 min bonus + wait time
 * - Tier 1 (Scheduled):  +30 min bonus + wait time if checked in, if slot start time is near, +0 else -Infinity
 * - Tier 0 (Walk-in):     +5 min bonus + wait time
 */
export const computePriorityScore = (token, now = new Date()) => {
  const queuedTime = token.queuedAt ? new Date(token.queuedAt).getTime() : new Date(token.createdAt || now).getTime();
  const minutesWaited = Math.max(0, (now.getTime() - queuedTime) / 60000);
  const tier = Number(token.priorityTier || 0);

  let bonus = 0;

  if (tier >= 3)
    bonus = 1_000_000;
  else if (tier === 2)
    bonus = 45;
  else if (tier === 1) {
    const slotStart = new Date(token.scheduledSlot.startTime).getTime();
    const checkedIn = Boolean(token.checkedInAt);
    if (checkedIn) {
        if (slotStart <= now.getTime()) bonus = 30;
    }
    else bonus = -minutesWaited;
  } else bonus = 5;
  return Number(bonus + minutesWaited).toFixed(3);
}

export const isTokenDispatchable = (token, now = new Date()) => {
  if (token.status !== "WAITING") return false;
  if (!token.scheduledSlot || !token.scheduledSlot.startTime) return true;

  const slotStart = new Date(token.scheduledSlot.startTime).getTime();
  return Boolean(token.checkedInAt) && slotStart <= now.getTime();
};

export const getOrderedWaitingTokens = async (serviceId, now = new Date()) => {
  const waiting = await Token.find({
    currentServiceId: serviceId,
    status: "WAITING",
  });

  const dispatchable = waiting.filter((t) => isTokenDispatchable(t, now));

  dispatchable.sort((a, b) => {
    const scoreDiff = computePriorityScore(b, now) - computePriorityScore(a, now);
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    const aTime = new Date(a.queuedAt || a.createdAt).getTime();
    const bTime = new Date(b.queuedAt || b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;

    return String(a._id).localeCompare(String(b._id));
  });

  return dispatchable;
};

export const snapshotServicePositions = async (serviceId) => {
  const ordered = await getOrderedWaitingTokens(serviceId);
  const map = new Map();
  ordered.forEach((t, idx) => {
    map.set(String(t._id), idx + 1);
  });
  return map;
};

export const recordPositionShifts = async ({
  serviceId,
  domainId,
  beforeMap,
  causeType,
  excludeTokenId = null,
}) => {
  if (!beforeMap || beforeMap.size === 0) return [];

  const afterOrdered = await getOrderedWaitingTokens(serviceId);
  const createdEvents = [];

  for (let idx = 0; idx < afterOrdered.length; idx++) {
    const token = afterOrdered[idx];
    const idStr = String(token._id);
    if (excludeTokenId && idStr === String(excludeTokenId)) continue;

    const fromPosition = beforeMap.get(idStr);
    const toPosition = idx + 1;

    if (fromPosition && toPosition > fromPosition) {
      const delta = toPosition - fromPosition;
      const label = CAUSE_LABELS[causeType] || "Queue Priority Update";
      const message = `+${delta} position${delta > 1 ? "s" : ""} due to 1 ${label}`;

      const event = await QueueEvent.create({
        tokenId: token._id,
        domainId: domainId || token.domainId,
        serviceId,
        fromPosition,
        toPosition,
        delta,
        causes: [{ type: causeType, count: 1 }],
        message,
      });

      createdEvents.push(event);
      emitTokenShifted(event);
    }
  }

  return createdEvents;
};

/**
 * Generates <PREFIX>-<3-digit sequence> (e.g., DOC-001) scoped to a domain.
 */
export const generateTicketNumber = async (domainId, service) => {
  const prefix = (service.prefix || "TKT").toUpperCase();
  const count = await Token.countDocuments({
    domainId,
    ticketNumber: new RegExp(`^${prefix}-`),
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
};

/**
 * Enriches raw Token documents into TokenView objects expected by the frontend.
 */
export const enrichTokenViews = async (tokens) => {
  if (!tokens || tokens.length === 0) return [];

  const serviceIds = [...new Set(tokens.map((t) => String(t.currentServiceId)))];
  const domainIds = [...new Set(tokens.map((t) => String(t.domainId)))];
  const tokenIds = tokens.map((t) => t._id);

  const [services, domains, pendingRequests] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } }),
    Domain.find({ _id: { $in: domainIds } }),
    ServiceChangeRequest.find({ tokenId: { $in: tokenIds }, status: "PENDING" }),
  ]);

  const serviceMap = new Map(services.map((s) => [String(s._id), s]));
  const domainMap = new Map(domains.map((d) => [String(d._id), d]));
  const changeMap = new Map(pendingRequests.map((r) => [String(r.tokenId), r]));

  // Precompute ordered queues per service so position & ETA are exact
  const queueMap = new Map();
  for (const sId of serviceIds) {
    const ordered = await getOrderedWaitingTokens(sId);
    queueMap.set(
      sId,
      new Map(ordered.map((t, idx) => [String(t._id), idx + 1]))
    );
  }

  const now = new Date();

  return tokens.map((doc) => {
    const plain = doc.toObject ? doc.toObject() : { ...doc };
    const sId = String(plain.currentServiceId);
    const dId = String(plain.domainId);
    const tId = String(plain._id);

    const service = serviceMap.get(sId);
    const domain = domainMap.get(dId);
    const position =
      plain.status === "WAITING"
        ? queueMap.get(sId)?.get(tId) || null
        : plain.status === "IN_SERVICE"
        ? 0
        : null;

    const avgHandle = service?.avgHandleTimeMins || 5;
    const estimatedWaitMins =
      position && position > 0
        ? Math.ceil((position * avgHandle) / COUNTERS_PER_SERVICE)
        : 0;

    const stepCount = Array.isArray(plain.workflowHistory) ? plain.workflowHistory.length : 1;

    return {
      ...plain,
      priorityScore: computePriorityScore(plain, now),
      position,
      estimatedWaitMins,
      serviceName: service?.name || "Service",
      domainName: domain?.name || "Domain",
      stepLabel: `Step ${Math.max(1, stepCount)}`,
      holderName: plain.holderName || "Citizen",
      pendingServiceChange: changeMap.get(tId) || null,
      canCheckIn: (plain.status === "WAITING") && plain.scheduledSlot?.startTime && isTokenDispatchable(plain, now),
      canRejoin: plain.status === "MISSED" && plain.rejoinCount < 3,
      queueLength: queueMap.get(sId)?.size || 0,
    };
  });
};