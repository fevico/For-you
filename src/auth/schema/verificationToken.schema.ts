import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VerificationTokenDocument = VerificationToken & Document;

@Schema({ timestamps: true }) 
export class VerificationToken {       
  @Prop({ required: true })
  token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: Date.now, expires: 3600 }) // 1 hour from now
  expiresAt: Date;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);