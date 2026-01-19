
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { User, UserDocument } from 'src/auth/schema/user.schema';
import { Transaction, TransactionDocument } from './schema/transaction.schema';
import { HitPayPaymentPayload, HitPayPaymentResponse } from './dto/payment.dto';
import  axios from 'axios';


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
    this.apiKey = this.config.get<string>('HITPAY_API_KEY') ?? "";
    this.baseUrl = this.config.get<string>('HITPAY_BASE_URL') ?? ""; // e.g. `https://api.sandbox.hit-pay.com`
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

  // Example usage
  // async createBeneficiary(...) {
  //   const result = await this.hitpayPost<{
  //     id: string;
  //     // other fields HitPay returns ...
  //   }>('/v1/beneficiaries', { /* ... */ });
  //   return result;         
  // }


  // private async hitpayPost(path: string, body: any) {
  //   const url = `${this.baseUrl}${path}`;
  //   const resp = await lastValueFrom(
  //     this.httpService.post(url, body, { headers: this.getHeaders() }),
  //   );
  //   return resp.data;
  // }

  private async hitpayGet(path: string) {
    const url = `${this.baseUrl}${path}`;
    const resp = await lastValueFrom(
      this.httpService.get(url, { headers: this.getHeaders() }),
    );
    return resp.data;
  }

  private async paymentRequest(payload: HitPayPaymentPayload): Promise<HitPayPaymentResponse> {
   try {
    const response = await axios.post(`${process.env.HITPAY_API_URL}/v1/payment-requests`, payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',    
        'X-BUSINESS-API-KEY': `${process.env.HITPAY_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    })          
    return { 
      id: response.data.id,
      url: response.data.url,
      status: response.data.status,
    } 
   } catch (error) {
    this.logger.error('Error creating payment request', error);
    throw error;
   }
  }

  async fundWallet(payload: HitPayPaymentPayload): Promise<any> {
    try {
      const response =  await this.paymentRequest(payload)
       return response;
    } catch (error) {
      throw new Error('Failed to fund wallet: ' + error.message);
    }
  }

  // async fundUserWallet(userId: string, amountPhp: number) {
  //   // 1. Fetch user
  //   const user = await this.userModel.findById(userId);
  //   if (!user) {
  //     throw new Error('User not found');
  //   }

  //   // 2. Create beneficiary if not exists
  //   let beneficiaryId = user['hitpayBeneficiaryId'];
  //   if (!beneficiaryId) {
  //     // you must have stored bank details on your User previously
  //     if (!user['bankSwift'] || !user['bankAccountNumber']) {
  //       throw new Error('User bank details missing');
  //     }

  //     const beneficiary = await this.hitpayPost('/v1/beneficiaries', {
  //       country: 'ph',
  //       transfer_method: 'bank_transfer',
  //       transfer_type: 'local',
  //       currency: 'php',
  //       holder_type: 'individual',
  //       holder_name: user.username,  
  //       bank_swift_code: user['bankSwift'],
  //       account_number: user['bankAccountNumber'],
  //     });

  //     beneficiaryId = beneficiary.id;
  //     user['hitpayBeneficiaryId'] = beneficiaryId;
  //     await user.save();
  //   }

  //   // 3. Initiate transfer
  //   const transfer = await this.hitpayPost('/v1/transfers', {
  //     beneficiary: { id: beneficiaryId },
  //     source_currency: 'php',
  //     payment_amount: amountPhp,
  //   });

  //   // 4. Save transaction in DB
  //   const tx = await this.txModel.create({
  //     user: new Types.ObjectId(userId),
  //     hitpayTransferId: transfer.id,
  //     beneficiary: transfer.beneficiary,
  //     amount: transfer.payment_amount,
  //     currency: transfer.payment_currency,
  //     sourceCurrency: transfer.source_currency,
  //     sourceAmount: transfer.source_amount,
  //     fee: {
  //       totalFee: transfer.total_fee,
  //       feeCurrency: transfer.fee_currency,
  //       feePayer: transfer.fee_payer,
  //     },
  //     status: transfer.status,
  //     initiatedAt: new Date(transfer.created_at),
  //     // we will fill completedAt when webhook calls
  //   });

  //   // 5. Optimistic / immediate update of user balance (or wait for webhook)
  //   // Option A: Credit immediately:
  //   user.balance += amountPhp;
  //   await user.save();

  //   return { transfer, transaction: tx };
  // }

  // Call this from a controller / webhook route
  async handleHitpayWebhook(event: any) {
    const eventType = event['type'];  // depends on your webhook payload structure
    const data = event['data'];

    this.logger.log(`Received webhook: ${eventType}`, data);

    if (
      eventType === 'transfer.updated' ||
      eventType === 'transfer.paid' ||
      eventType === 'transfer.failed'
    ) {
      const transferId = data.id;
      const status = data.status;

      const tx = await this.txModel.findOne({ hitpayTransferId: transferId });
      if (!tx) {
        this.logger.error(`Transaction not found for transferId ${transferId}`);
        return;
      }

      tx.status = status;

      if (data['paid_at']) {
        tx.completedAt = new Date(data['paid_at']);
      }

      await tx.save();

      // If transfer is paid, ensure user balance is correct
      if (status === 'paid' || status === 'completed') {
        const user = await this.userModel.findById(tx.user);
        if (user) {
          // You might check if you already credited this to avoid double-crediting
          user.balance += tx.amount;
          await user.save();
        }
      }
    }
  }

  async getAllTransfers() {
    const resp = await this.hitpayGet('/v1/transfers');
    return resp;
  }

  async getTransfer(transferId: string) {
    const resp = await this.hitpayGet(`/v1/transfers/${transferId}`);
    return resp;
  }
}
