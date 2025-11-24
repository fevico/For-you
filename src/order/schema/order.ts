import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })  // Adds createdAt/updatedAt
export class User {
  @Prop({ required: true, type: String })
  product: string;

  @Prop({ required: true })
  email: string;

  @Prop({type: Number})
  amount: number

  @Prop({type: String})
  reference: string;
} 

export const UserSchema = SchemaFactory.createForClass(User);