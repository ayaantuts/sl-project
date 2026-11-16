import { Schema, model } from "mongoose";

const serviceChangeRequestSchema = new Schema(
  {
    tokenId: { type: Schema.Types.ObjectId, ref: "Token", required: true, index: true },
    domainId: { type: Schema.Types.ObjectId, ref: "Domain", required: true, index: true },
    fromServiceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    toServiceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    reason: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default model("ServiceChangeRequest", serviceChangeRequestSchema);