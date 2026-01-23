
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/auth/schema/user.schema';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({type: String, required: true})
  referenceNumber: string; 

  @Prop({type: String, required: true})
  email: string

  @Prop({ required: true })
  amount: number;

  @Prop({type: String, required: true })
  currency: string;

  @Prop({type: String, required: true })
  transferId: string;

  @Prop({ type: String, enum: ['scheduled', 'pending', 'processing', 'paid', 'failed', 'canceled'] })
  status: string;

  @Prop({ type: String, required: false })
  purpose: string;

  @Prop({ type: Date, default: Date.now() })
  completedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
