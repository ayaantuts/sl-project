import { Schema, model } from 'mongoose';

const serviceSchema = new Schema({
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  name: { type: String, required: true, trim: true },
  prefix: { type: String, required: true, trim: true, uppercase: true },
  avgHandleTimeMins: { type: Number, default: 5 },
  waitingCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default model('Service', serviceSchema);