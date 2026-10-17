import { Schema, model } from 'mongoose';

const domainSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  settings: {
    allowGroupBooking: { type: Boolean, default: true },
    noShowTimeoutMins: { type: Number, default: 5 },
    maxGroupSize: { type: Number, default: 5 }
  }
}, { timestamps: true });

export default model('Domain', domainSchema);