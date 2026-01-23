import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
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


  async handleHitpayWebhook(payload: any) {
    const { reference_number, status, paid_at } = payload; // Destructure with paid_at if present

    this.logger.log(
      `Received webhook for ref: ${reference_number}, status: ${status}`,
    );

    const tx = await this.txModel.findOne({
      referenceNumber: reference_number,
    });

    if (!tx) {
      this.logger.error(`Transaction not found: ${reference_number}`);
      return;
    }

    // Prevent double processing
    if (tx.status === 'completed' || tx.status === 'succeeded') {
      this.logger.warn(`Transaction already processed: ${reference_number}`);
      return;
    }

    tx.status = status;

    if (paid_at) {
      tx.completedAt = new Date(paid_at);
    } else if (payload.updated_at) {
      // Fallback if paid_at not present; use updated_at from examples
      tx.completedAt = new Date(payload.updated_at);
    }

    await tx.save();
    this.logger.log(
      `Updated transaction status to ${status} for ${reference_number}`,
    );

    // Credit user ONCE if successful
    if (status === 'completed' || status === 'succeeded') {
      const user = await this.userModel.findById(tx.user);
      if (user) {
        user.balance += tx.amount;
        await user.save();
        this.logger.log(`Credited user ${tx.user} with ${tx.amount}`);
      } else {
        this.logger.error(`User not found for tx: ${reference_number}`);
      }
    }
  }

  async withTransaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.txModel.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Helper to create pending tx (used in purchase)
  // async createPendingGiftCardTx(
  //   userId: string,
  //   dto: CreateOrderRequest,
  //   amountNGN: number,
  //   session: ClientSession,
  // ): Promise<Transaction> {
  //   const tx = new this.txModel({
  //     user: userId,
  //     type: TransactionType.GIFT_CARD_PURCHASE,
  //     amount: amountNGN,
  //     status: TransactionStatus.PENDING,
  //     requestPayload: dto,
  //     reloadlyCustomIdentifier: `order-${Date.now()}-${userId.slice(-6)}`, // unique for Reloadly
  //   });

  //   return tx.save({ session });
  // }

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

  // In your gift-card.service.ts or payment.service.ts

// Example constants – adjust to your business
private readonly MARKUP_PERCENTAGE = 8; // 8% profit + buffer for FX/fees
private readonly FIXED_SERVICE_FEE_NGN = 200; // optional flat fee per order

// You'll need a real FX rate source in production (e.g., from an API or cache)
private async getFxRate(recipientCurrency: string): Promise<number> {
  // Placeholder – in real app, fetch from exchangerate-api.com, your cache, or Reloadly's rate endpoint if available
  // For sandbox testing:
  const rates: Record<string, number> = {
    USD: 1650, // 1 USD ≈ ₦1650
    PHP: 28,   // 1 PHP ≈ ₦28
    SGD: 1220, // 1 SGD ≈ ₦1220
  };
  return rates[recipientCurrency?.toUpperCase()] || 1600; // fallback to ~USD rate
}

// Main method
// async calculateSellingPrice(dto: CreateOrder): Promise<number> {
//   // Fetch product to get real currency & confirm unitPrice
//   const token = await this.getAccessToken();
//   const product = await this.getProductDetails(dto.productId, token);

//   const faceValue = dto.unitPrice * (dto.quantity || 1); // e.g., 500 PHP
//   const currency = product.recipientCurrencyCode || 'USD'; // from product details

//   const fxRate = await this.getFxRate(currency); // 1 foreign unit → NGN

//   const faceValueNGN = faceValue * fxRate;

//   // Your selling price = face value in NGN + markup + optional fee
//   const markupAmount = faceValueNGN * (this.MARKUP_PERCENTAGE / 100);
//   const totalNGN = Math.ceil(faceValueNGN + markupAmount + this.FIXED_SERVICE_FEE_NGN);

//   return totalNGN;
// }

}
