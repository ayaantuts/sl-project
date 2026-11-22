import { Schema, model } from "mongoose";

const workflowStepSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  serviceName: { type: String, default: "Unknown" },
  counterId: { type: String, default: "Counter 1" },
  status: {
    type: String,
    enum: ["WAITING", "IN_SERVICE", "COMPLETED", "TRANSFERRED", "MISSED", "CANCELLED", "PENDING", "CALLED"],
    default: "WAITING",
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  notes: { type: String, default: "" }
});

const tokenSchema = new Schema({
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  currentServiceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

  ticketNumber: { type: String, required: true, index: true },
  userRef: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  groupSize: { type: Number, default: 1 },

  status: { 
    type: String, 
    enum: ["WAITING", "IN_SERVICE", "COMPLETED", "TRANSFERRED", "MISSED", "CANCELLED", "PENDING"],
    default: 'WAITING'
  },

  priorityTier: { type: Number, default: 0 },
  priorityScore: { type: Number, default: 0 },

  scheduledSlot: {
    startTime: Date,
    endTime: Date
  },

  workflowHistory: [workflowStepSchema],
  serviceStartedAt: Date,

  queuedAt: { type: Date, default: Date.now },
  checkedInAt: { type: Date, default: null },
  rejoinCount: { type: Number, default: 0 },
  dependentId: { type: Schema.Types.ObjectId, ref: "Dependent", default: null },
  holderName: { type: String, trim: true },
}, { timestamps: true });

tokenSchema.index({ domainId: 1, currentServiceId: 1, status: 1 });

export default model('Token', tokenSchema);