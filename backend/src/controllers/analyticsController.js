import Domain from "../models/Domain.js";
import Service from "../models/Service.js";
import Token from "../models/Token.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getAnalytics = async (domainId) => {
  const domain = await Domain.findById(domainId);
  if (!domain) throw new ApiError(404, "Domain not found");
  
  const [services, tokens] = await Promise.all([
    Service.find({ domainId }).sort({ createdAt: 1 }),
    Token.find({ domainId }),
  ]);

  const byStatus = {
    WAITING: 0,
    IN_SERVICE: 0,
    COMPLETED: 0,
    TRANSFERRED: 0,
    MISSED: 0,
    CANCELLED: 0,
  };
  
  let totalWaitMins = 0;
  let waitedSamples = 0;

  const hourlyCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    label: `${String(h).padStart(2, "0")}:00 - ${String(h).padStart(2, "0")}:59`,
    count: 0,
  }));

  const counterMap = new Map();
  
  for (const t of tokens) {
    if (byStatus[t.status] !== undefined) {
      byStatus[t.status] += 1;
    }

    if (t.createdAt) {
      const hr = new Date(t.createdAt).getHours();
      hourlyCounts[hr].count += 1;
    }

    if (t.serviceStartedAt && t.queuedAt) {
      const wait = Math.max(
        0,
        (new Date(t.serviceStartedAt).getTime() - new Date(t.queuedAt).getTime()) /
          60000
      );
      totalWaitMins += wait;
      waitedSamples += 1;
    }

    for (const step of t.workflowHistory || []) {
      if (!step.counterId) continue;
      const entry = counterMap.get(step.counterId) || {
        counterId: step.counterId,
        serviceName: step.serviceName || "Unknown",
        served: 0,
        completed: 0,
        missed: 0,
      };
      entry.served += 1;
      if (step.status === "COMPLETED" || step.status === "TRANSFERRED") {
        entry.completed += 1;
      } else if (step.status === "MISSED") {
        entry.missed += 1;
      }
      counterMap.set(step.counterId, entry);
    }
  }

  const serviceStats = services.map((s) => {
    const sTokens = tokens.filter(
      (t) => String(t.currentServiceId) === String(s._id)
    );
    return {
      serviceId: s._id,
      serviceName: s.name,
      domainName: domain.name,
      prefix: s.prefix,
      isActive: s.isActive,
      avgHandleTimeMins:
        sTokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length > 0
          ? Math.round(
              sTokens
                .filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt)
                .reduce((sum, t) => {
                  const serviceTime = Math.max(
                    0,
                    (new Date(t.serviceEndedAt).getTime() - new Date(t.serviceStartedAt).getTime()) /
                      60000
                  );
                  return sum + serviceTime;
                }, 0) /
                sTokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length
            )
          : 0,
      waiting: sTokens.filter((t) => t.status === "WAITING").length,
      inService: sTokens.filter((t) => t.status === "IN_SERVICE").length,
      completed: sTokens.filter((t) => t.status === "COMPLETED").length,
      missed: sTokens.filter((t) => t.status === "MISSED").length,
      cancelled: sTokens.filter((t) => t.status === "CANCELLED").length,
      activeCounters: Array.from(counterMap.values()).filter(
        (c) => c.serviceId === String(s._id)
      ).length,
      avgWaitMins:
        sTokens.filter((t) => t.serviceStartedAt && t.queuedAt).length > 0
          ? Math.round(
              sTokens
                .filter((t) => t.serviceStartedAt && t.queuedAt)
                .reduce((sum, t) => {
                  const wait = Math.max(
                    0,
                    (new Date(t.serviceStartedAt).getTime() - new Date(t.queuedAt).getTime()) /
                      60000
                  );
                  return sum + wait;
                }, 0) /
                sTokens.filter((t) => t.serviceStartedAt && t.queuedAt).length
            )
          : 0,
      avgServiceMins:
        sTokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length > 0
          ? Math.round(
              sTokens
                .filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt)
                .reduce((sum, t) => {
                  const serviceTime = Math.max(
                    0,
                    (new Date(t.serviceEndedAt).getTime() - new Date(t.serviceStartedAt).getTime()) /
                      60000
                  );
                  return sum + serviceTime;
                }, 0) /
                sTokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length
            )
          : 0,
      throughputPerHour:
        sTokens.filter((t) => t.status === "COMPLETED").length > 0
          ? Math.round(
              sTokens.filter((t) => t.status === "COMPLETED").length /
                ((Math.max(
                  ...sTokens
                    .filter((t) => t.status === "COMPLETED")
                    .map((t) => new Date(t.serviceEndedAt).getTime())
                ) -
                  Math.min(
                    ...sTokens
                      .filter((t) => t.status === "COMPLETED")
                      .map((t) => new Date(t.serviceStartedAt).getTime())
                  )) /
                  3600000)
            )
          : 0,
      backlogMins:
        sTokens.filter((t) => t.status === "WAITING").length > 0
          ? Math.round(
              sTokens
                .filter((t) => t.status === "WAITING" && t.queuedAt)
                .reduce((sum, t) => {
                  const wait = Math.max(
                    0,
                    (new Date().getTime() - new Date(t.queuedAt).getTime()) / 60000
                  );
                  return sum + wait;
                }, 0) /
                sTokens.filter((t) => t.status === "WAITING" && t.queuedAt).length
            )
          : 0,
      recommendedCounters: Math.ceil(
        sTokens.filter((t) => t.status === "WAITING").length / 10
      ),
      isBottleneck:
        sTokens.filter((t) => t.status === "WAITING").length >
        sTokens.filter((t) => t.status === "IN_SERVICE").length,
    };
  });

  const totals = {
    issued: tokens.length,
    waiting: byStatus.WAITING,
    inService: byStatus.IN_SERVICE,
    completed: byStatus.COMPLETED,
    missed: byStatus.MISSED,
    cancelled: byStatus.CANCELLED,
    avgWaitMins: waitedSamples > 0 ? Math.round(totalWaitMins / waitedSamples) : 0,
    avgServiceMins:
      tokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length > 0
        ? Math.round(
            tokens
              .filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt)
              .reduce((sum, t) => {
                const serviceTime = Math.max(
                  0,
                  (new Date(t.serviceEndedAt).getTime() - new Date(t.serviceStartedAt).getTime()) /
                    60000
                );
                return sum + serviceTime;
              }, 0) /
              tokens.filter((t) => t.status === "COMPLETED" && t.serviceEndedAt && t.serviceStartedAt).length
          )
        : 0,
    noShowRate:
      tokens.filter((t) => t.status === "WAITING" || t.status === "IN_SERVICE").length > 0
        ? byStatus.MISSED /
          (byStatus.WAITING + byStatus.IN_SERVICE + byStatus.MISSED)
        : 0,
    positionShiftEvents: tokens.reduce(
      (sum, t) => sum + (t.positionShiftEvents || 0),
      0
    ),
  };

  return {
    totals,
    byStatus,
    services: serviceStats,
    hourly: hourlyCounts,
    counters: counterMap ? Array.from(counterMap.values()) : [],
  };
};

export const getDomainAnalytics = asyncHandler(async (req, res) => {
  const { domainId } = req.params;
  const domain = await Domain.findById(domainId);
  if (!domain) throw new ApiError(404, "Domain not found");

  if (
    req.user.role === "Moderator" &&
    String(domain.moderatorRef) !== String(req.user._id)
  ) {
    throw new ApiError(403, "Not authorized to view analytics for this domain");
  }

  const { totals, byStatus, services, hourly, counters } = await getAnalytics(domainId);

  return new ApiResponse(
    200,
    {
      totals,
      byStatus,
      services,
      hourly,
      counters,
      generatedAt: new Date().toISOString(),
    },
    "Domain analytics retrieved successfully"
  );
});

export const getAllDomainsAnalytics = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "Moderator") {
    filter.moderatorRef = req.user._id;
  }
  const domains = await Domain.find(filter);
  const analyticsData = [];
  
  for (const domain of domains) {
    const { totals, byStatus, services, hourly, counters } = await getAnalytics(domain._id);
    analyticsData.push({
      domainId: domain._id,
      domainName: domain.name,
      totals,
      byStatus,
      services,
      hourly,
      counters,
      generatedAt: new Date().toISOString(),
    });
  }
  
  return new ApiResponse(
    200,
    analyticsData,
    "Analytics for all domains retrieved successfully"
  );
});