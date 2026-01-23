import { Module } from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { GiftcardController } from './giftcard.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentService } from 'src/payment/payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/auth/schema/user.schema';
import { Transaction, TransactionSchema } from 'src/payment/schema/transaction.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    ConfigModule, 
    JwtModule, 
    HttpModule
  ],
  providers: [GiftcardService, PaymentService],
  controllers: [GiftcardController],
})
export class GiftcardModule {}
