import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { User, UserDocument } from 'src/auth/schema/user.schema';
import { Transaction, TransactionDocument } from './schema/transaction.schema';
import { HitPayPaymentPayload, HitPayPaymentResponse } from './dto/payment.dto';
import axios from 'axios';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private apiKey: string;
  private baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private txModel: Model<TransactionDocument>,
  ) {
    this.apiKey = this.config.get<string>('HITPAY_API_KEY') ?? '';
    this.baseUrl = this.config.get<string>('HITPAY_BASE_URL') ?? ''; // e.g. `https://api.sandbox.hit-pay.com`
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-BUSINESS-API-KEY': this.apiKey,
    };
  }

  private async hitpayPost<T = any>(path: string, body: any): Promise<T> {
    const { data } = await lastValueFrom(
      this.httpService.post<T>(`${this.baseUrl}${path}`, body, {
        headers: this.getHeaders(),
      }),
    );
    return data;
  }

  private async hitpayGet(path: string) {
    const url = `${this.baseUrl}${path}`;
    const resp = await lastValueFrom(
      this.httpService.get(url, { headers: this.getHeaders() }),
    );
    return resp.data;
  }

  private async paymentRequest(
    payload: HitPayPaymentPayload,
    userId: string,
  ): Promise<HitPayPaymentResponse> {
    try {
      const reference_number = this.generateShortRef();
      const response = await axios.post(
        `${process.env.HITPAY_API_URL}/v1/payment-requests`,
        {
          ...payload,
          reference_number,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-BUSINESS-API-KEY': `${process.env.HITPAY_API_KEY}`,
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
      );
      console.log('response from payment', response);
      // save credentials to db
      const data = {
        user: userId,
        name: response.data.name,
        email: response.data.email,
        amount: Number(response.data.amount.replace(/,/g, '')),
        referenceNumber: response.data.reference_number,
        purpose: response.data.purpose,
        currency: response.data.currency,
        status: response.data.status,
        transferId: response.data.id,
      };
      const transaction = await this.txModel.create(data);
      console.log('save transaction', transaction);
      return {
        id: response.data.id,
        url: response.data.url,
        status: response.data.status,
      };
    } catch (error) {
      this.logger.error('Error creating payment request', error);
      throw error;
    }
  }

  async fundWallet(
    payload: HitPayPaymentPayload,
    userId: string,
  ): Promise<any> {
    try {
      const response = await this.paymentRequest(payload, userId);
      return response;
    } catch (error) {
      throw new Error('Failed to fund wallet: ' + error.message);
    }
  }

  // Call this from a controller / webhook route
  async handleHitpayWebhook(payload: any) {
  this.logger.log('Received HitPay webhook', payload);

  const {
    reference_number,
    status,
    amount,
    payment_id,
    payment_request_id,
  } = payload;

  if (!reference_number || !status) {
    this.logger.error('Invalid webhook payload', payload);
    return;
  }

  const tx = await this.txModel.findOne({ referenceNumber: reference_number });

  if (!tx) {
    this.logger.error(`Transaction not found for reference ${reference_number}`);
    return;
  }

  // 🛑 Prevent double-processing
  if (tx.status === 'completed') {
    this.logger.warn(`Transaction already completed: ${reference_number}`);
    return;
  }

  tx.status = status;

  if (status === 'completed') {
    tx.completedAt = new Date();
  }

  await tx.save();

  // ✅ Credit wallet ONCE
  if (status === 'completed') {
    const user = await this.userModel.findById(tx.user);
    if (user) {
      user.balance += tx.amount;
      await user.save();
    }
  }
}


  private generateShortRef(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  async getAllTransfers() {
    const resp = await this.hitpayGet('/v1/transfers');
    return resp;
  }

  async getTransfer(transferId: string) {
    const resp = await this.hitpayGet(`/v1/transfers/${transferId}`);
    return resp;
  }

  //   data: {
  //     id: 'a0e67ee5-ff0d-484b-9def-137c2ef53f6a',
  //     name: null,
  //     email: 'user@example.com',
  //     phone: null,
  //     amount: '5,000.00',
  //     currency: 'SGD',
  //     is_currency_editable: false,
  //     status: 'pending',
  //     purpose: 'Wallet funding',
  //     reference_number: null,
  //     payment_methods: [ 'paynow_online' ],
  //     url: 'https://securecheckout.sandbox.hit-pay.com/payment-request/@fa-business-consultancy-services/a0e67ee5-ff0d-484b-9def-137c2ef53f6a/checkout',
  //     redirect_url: 'https://yourdomain.com/payment/success',
  //     webhook: 'https://yourdomain.com/api/webhooks/hitpay',
  //     send_sms: false,
  //     send_email: false,
  //     sms_status: 'pending',
  //     email_status: 'pending',
  //     allow_repeated_payments: false,
  //     expiry_date: null,
  //     address: null,
  //     line_items: null,
  //     executor_id: null,
  //     created_at: '2026-01-23T05:45:19',
  //     updated_at: '2026-01-23T05:45:19',
  //     staff_id: null,
  //     business_location_id: null
  //   }
  // }
}
