import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Adds createdAt/updatedAt
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // Hash this in production!

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: true, enum: ["Pending", "Success", "Failed"], default: "Pending" })
  verification: string;

  @Prop({
    type: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },
    default: null,
    _id: false,
  })
  identity?: {
    url: string;
    public_id: string;
  };

  @Prop({ type: Number, default: 0 })
  balance: number;

  _id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
