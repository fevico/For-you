import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { HitPayPaymentPayload, HitPayPaymentResponse } from './dto/payment.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/guard/auth.guard';
import type { Response } from 'express';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create payment intent via HitPay' })
  @ApiBody({
    type: HitPayPaymentPayload,
    description: 'Payment payload with transaction details',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    type: HitPayPaymentResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment payload' })
  async paymentIntent(@Body() payload: HitPayPaymentPayload, @Req() req) {
    const userId = req.user?.id as string;
    return this.paymentService.fundWallet(payload, userId);
  }

  @Post('webhook')
  @HttpCode(200) 
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const event = req.body;

      await this.paymentService.handleHitpayWebhook(event);

      // Always return 200 quickly
      return res.json({ received: true });
    } catch (error) {
      // Still return 200 to avoid endless retries
      return res.json({ received: true });
    }
  }
}
