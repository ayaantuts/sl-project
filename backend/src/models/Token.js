const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  counterId: { type: String },
  status: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date, default: Date.now },
  notes: { type: String }
});

const tokenSchema = new mongoose.Schema({
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true },
  currentServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

  ticketNumber: { type: String, required: true },
  userRef: { type: String, required: true },
  groupSize: { type: Number, default: 1 },

  status: { 
    type: String, 
    enum: ['WAITING', 'IN_SERVICE', 'COMPLETED', 'TRANSFERRED', 'MISSED', 'CANCELLED'],
    default: 'WAITING'
  },

  priorityTier: { type: Number, default: 0 },
  priorityScore: { type: Number, default: 0 },

  scheduledSlot: {
    startTime: Date,
    endTime: Date
  },

  workflowHistory: [workflowStepSchema],
  
  serviceStartedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);