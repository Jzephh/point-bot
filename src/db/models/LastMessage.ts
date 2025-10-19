import mongoose, { Schema, Document } from 'mongoose';

export interface ILastMessage extends Document {
  companyId: string;
  experienceId: string;
  lastMessageId: string;
  lastProcessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LastMessageSchema = new Schema<ILastMessage>({
  companyId: { type: String, required: true, index: true },
  experienceId: { type: String, required: true, index: true },
  lastMessageId: { type: String, required: true },
  lastProcessedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Compound index for efficient queries
LastMessageSchema.index({ companyId: 1, experienceId: 1 }, { unique: true });

export const LastMessage = mongoose.model<ILastMessage>('LastMessage', LastMessageSchema);
