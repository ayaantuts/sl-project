import Token from "../models/Token.js";
import Domain from "../models/Domain.js";
import { emitQueueUpdated, emitTokenUpdated } from "../sockets/index.js";

export const runQueueTick = async () => {
  try {
    const now = new Date();
    const domains = await Domain.find().select("_id settings");
    const timeoutMap = new Map(
      domains.map((d) => [String(d._id), d.settings?.noShowTimeoutMins ?? 5])
    );

    // 1. Expire CALLED tokens that exceeded noShowTimeoutMins
    const inServiceTokens = await Token.find({ status: "IN_SERVICE" });
    for (const token of inServiceTokens) {
      const lastStep = token.workflowHistory[token.workflowHistory.length - 1];
      if (!lastStep || lastStep.status !== "CALLED" || !lastStep.startedAt) {
        continue;
      }

      const timeoutMins = timeoutMap.get(String(token.domainId)) ?? 5;
      const elapsedMins =
        (now.getTime() - new Date(lastStep.startedAt).getTime()) / 60000;

      if (elapsedMins >= timeoutMins) {
        token.status = "MISSED";
        lastStep.status = "MISSED";
        lastStep.completedAt = now;
        await token.save();

        emitQueueUpdated({
          domainId: String(token.domainId),
          serviceId: String(token.currentServiceId),
        });
        emitTokenUpdated({
          tokenId: String(token._id),
          domainId: String(token.domainId),
          status: "MISSED",
        });
      }
    }

    // 2. Expire scheduled tokens not checked in by slot endTime
    const expiredSlots = await Token.find({
      status: "WAITING",
      checkedInAt: null,
      "scheduledSlot.endTime": { $lt: now },
    });

    for (const token of expiredSlots) {
      token.status = "MISSED";
      const lastStep = token.workflowHistory[token.workflowHistory.length - 1];
      if (lastStep && !lastStep.completedAt) {
        lastStep.status = "MISSED";
        lastStep.completedAt = now;
      }
      await token.save();

      emitQueueUpdated({
        domainId: String(token.domainId),
        serviceId: String(token.currentServiceId),
      });
      emitTokenUpdated({
        tokenId: String(token._id),
        domainId: String(token.domainId),
        status: "MISSED",
      });
    }
  } catch (err) {
    console.error("[scheduler] Queue tick error:", err.message);
  }
};

export const startScheduler = (intervalMs = 10_000) => {
  setInterval(runQueueTick, intervalMs);
};