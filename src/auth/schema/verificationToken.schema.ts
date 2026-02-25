import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type VerificationTokenDocument = VerificationToken & Document;

@Schema({ timestamps: true }) 
export class VerificationToken {       
  @Prop({ required: true })
  token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({type: String, required: true, enum: ["Password", "Email"], default:  "Email"})
  type: "Email" | "Password" 

  @Prop({ type: Date, default: Date.now, expires: 3600 }) 
  expiresAt: Date;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);