import { Module } from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { GiftcardController } from './giftcard.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [GiftcardService],
  controllers: [GiftcardController]
})
export class GiftcardModule {}
