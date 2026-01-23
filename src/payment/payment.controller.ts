import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  Logger
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { HitPayPaymentPayload, HitPayPaymentResponse } from './dto/payment.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/guard/auth.guard';
import type { Response, Request } from 'express';
import crypto from "crypto"

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);
  
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
  // async handleWebhook(@Req() req: Request, @Res() res: Response) {
  //   try {
  //     const event = req.body;

  //     await this.paymentService.handleHitpayWebhook(event);

  //     // Always return 200 quickly
  //     return res.json({ received: true });
  //   } catch (error) {
  //     // Still return 200 to avoid endless retries
  //     return res.json({ received: true });
  //   }
  // }
// Controller method (e.g., payment.controller.ts)
// Use rawBody for signature validation as per HitPay docs (HMAC on raw JSON payload)
// Ensure the verify middleware is set up as above to populate req.rawBody

@Post('webhook')
@HttpCode(200)
async handleWebhook(@Req() req: any, @Res() res: Response) {
  const signature = req.headers['hitpay-signature'] as string;
  const rawPayload = req.rawBody;  // This should be a Buffer from the verify function
  const salt = process.env.WEBHOOK_SALT;

  if (!salt) {
    this.logger.error('Missing WEBHOOK_SALT environment variable');
    return res.status(500).send('Server configuration error');
  }

  if (!signature || !rawPayload) {
    this.logger.warn('Invalid webhook request: missing signature or payload');
    return res.status(400).send('Invalid webhook');
  }

  // Compute HMAC on raw payload (Buffer is fine for update())
  const computedSignature = crypto
    .createHmac('sha256', salt)
    .update(rawPayload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature))) {
    this.logger.warn('Invalid signature for webhook');
    return res.status(401).send('Invalid signature');
  }

  // Signature valid: process the parsed body
  this.logger.log('Webhook signature validated successfully');
  await this.paymentService.handleHitpayWebhook(req.body);

  // Return 200 OK quickly to acknowledge
  return res.send('OK');
}
}
