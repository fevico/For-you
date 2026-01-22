import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { HitPayPaymentPayload, HitPayPaymentResponse } from './dto/payment.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/guard/auth.guard';

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
    const userId = req.user?.id as string
    return this.paymentService.fundWallet(payload, userId);
  }
}
