import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { HitPayPaymentPayload } from './dto/payment.dto';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService){}

    @Post()
    async paymentIntent(@Body() payload: HitPayPaymentPayload){
        return this.paymentService.fundWallet(payload)    
    }
}
