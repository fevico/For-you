import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftcardModule } from './giftcard/giftcard.module';
import { PaymentModule } from './payment/payment.module';
import { EmailModule } from './email/email.module';
import * as Joi  from "joi"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true,
      envFilePath: '.env', // Path to your .env file
      validationSchema: Joi.object({
      JWT_SECRET: Joi.string().required(),
      MONGODB_URI: Joi.string().required(),
      }),
     }),  // Loads .env globally
    MongooseModule.forRoot(process.env.MONGODB_URI!),  // Connects to MongoDB
    AuthModule, GiftcardModule, PaymentModule, EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
