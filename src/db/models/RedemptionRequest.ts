import mongoose, { Schema, Document } from 'mongoose';

export interface IRedemptionRequest extends Document {
  userId: string;
  companyId: string;
  prizeKey: string; // e.g., free_week, free_month
  prizeLabel: string; // human-readable label
  pointsCost: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  processedAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionRequestSchema = new Schema<IRedemptionRequest>({
  userId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  prizeKey: { type: String, required: true },
  prizeLabel: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  submittedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

// Index for user + status queries
RedemptionRequestSchema.index({ userId: 1, companyId: 1, status: 1 });

export const RedemptionRequest = mongoose.model<IRedemptionRequest>('RedemptionRequest', RedemptionRequestSchema);


