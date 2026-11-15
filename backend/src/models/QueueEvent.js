import { Schema, model } from "mongoose";

const causeSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "EMERGENCY_OVERRIDE",
        "VULNERABLE_BOOST",
        "SCHEDULED_ARRIVAL",
        "PRIORITY_JOIN",
        "SERVICE_CHANGE",
      ],
      required: true,
    },
    count: { type: Number, default: 1 },
  },
  { _id: false }
);

const queueEventSchema = new Schema(
  {
    tokenId: { type: Schema.Types.ObjectId, ref: "Token", required: true, index: true },
    domainId: { type: Schema.Types.ObjectId, ref: "Domain", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    fromPosition: { type: Number, required: true },
    toPosition: { type: Number, required: true },
    delta: { type: Number, required: true },
    causes: [causeSchema],
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default model("QueueEvent", queueEventSchema);