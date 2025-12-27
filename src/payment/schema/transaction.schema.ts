
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/auth/schema/user.schema';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  hitpayTransferId: string;

  @Prop({ type: Object, default: null })
  beneficiary: any;  // store the beneficiary object from HitPay

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop()
  sourceCurrency: string;

  @Prop()
  sourceAmount: number;

  @Prop({ type: Object, default: null })
  fee: {
    totalFee: number;
    feeCurrency: string;
    feePayer: string;
  };

  @Prop({ type: String, enum: ['scheduled', 'processing', 'paid', 'failed', 'canceled'], default: 'scheduled' })
  status: string;

  @Prop({ type: Date })
  initiatedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: String, required: false })
  remark: string;

  @Prop({ type: String, required: false })
  reference: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
