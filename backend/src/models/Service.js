import { Schema, model } from 'mongoose';

const serviceSchema = new Schema({
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  name: { type: String, required: true },
  prefix: { type: String, required: true },
  avgHandleTimeMins: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default model('Service', serviceSchema);