import mongoose, { Schema, Document } from 'mongoose';

export interface IPointsTransaction extends Document {
  userId: string;
  companyId: string;
  experienceId?: string;
  messageId?: string; // id of the source message (if applicable)
  pointsDelta: number; // positive for award, negative for revert
  reason: string;
  reverted: boolean; // true if this transaction is a revert or has been reverted
  createdAt: Date;
  updatedAt: Date;
}

const PointsTransactionSchema = new Schema<IPointsTransaction>({
  userId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  experienceId: { type: String, default: undefined, index: true },
  messageId: { type: String, default: undefined, index: true },
  pointsDelta: { type: Number, required: true },
  reason: { type: String, required: true },
  reverted: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Ensure we don't double-award for the exact same message
PointsTransactionSchema.index({ companyId: 1, messageId: 1, pointsDelta: 1 }, { unique: false });

export const PointsTransaction = mongoose.model<IPointsTransaction>('PointsTransaction', PointsTransactionSchema);


