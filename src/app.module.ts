import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftCardModule } from './gift-card/gift-card.module';
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
    AuthModule, GiftCardModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
