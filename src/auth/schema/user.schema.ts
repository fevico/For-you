import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })  // Adds createdAt/updatedAt
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;  // Hash this in production!

 @Prop({ type: MongooseSchema.Types.ObjectId })
  _id?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);