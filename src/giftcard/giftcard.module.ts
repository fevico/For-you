import { Module } from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { GiftcardController } from './giftcard.controller';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule, JwtModule],
  providers: [GiftcardService],
  controllers: [GiftcardController]
})
export class GiftcardModule {}
