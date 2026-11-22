import { Schema, model } from "mongoose";

const dependentSchema = new Schema(
  {
    guardianRef: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    isVulnerable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("Dependent", dependentSchema);