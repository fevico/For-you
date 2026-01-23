import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderResponseDto, RedeemInstructionsDto } from './dto/giftcard.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from 'src/payment/schema/transaction.schema';
import { User, UserDocument } from 'src/auth/schema/user.schema';
import { PaymentService } from 'src/payment/payment.service';

interface ReloadlyToken {
  access_token: string;
  expires_in: number; // seconds
  scope: string;
  token_type: string;
}

export interface CreateOrderRequest {
  productId: number;
  quantity: number;
  recipientEmail: string;
  recipientPhone?: string;
  senderEmail?: string;
  unitPrice: number;
  notificationLanguage?: string;
}

@Injectable()
export class GiftcardService {
  private readonly logger = new Logger(GiftcardService.name);

  // In-memory token cache
  private token: ReloadlyToken | null = null;
  private tokenExpiresAt: number = 0; // epoch ms
  constructor(private readonly config: ConfigService, 
    private txService: PaymentService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private txModel: Model<TransactionDocument>,
  ) {}

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (leave a 1-minute safety buffer)
    if (this.token && now < this.tokenExpiresAt - 60_000) {
      return this.token.access_token;
    }

    const authUrl = 'https://auth.reloadly.com/oauth/token';

    const body = {
      client_id: this.config.get<string>('RELOADLY_CLIENT_ID'),
      client_secret: this.config.get<string>('RELOADLY_CLIENT_SECRET'),
      grant_type: 'client_credentials',
      audience: 'https://giftcards-sandbox.reloadly.com',
    };

    this.logger.log('Requesting new Reloadly access token...');

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token request failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as ReloadlyToken;
    this.token = data;
    this.tokenExpiresAt = now + data.expires_in * 1000;

    this.logger.log('New access token acquired');
    return data.access_token;
  }

  async getCountries(): Promise<any> {
    const token = await this.getAccessToken();

    const url = 'https://giftcards-sandbox.reloadly.com/countries';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Countries request failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  async getByCountryCode(countryCode: string): Promise<any> {
    const token = await this.getAccessToken();
    const url = `https://giftcards-sandbox.reloadly.com/countries/${countryCode}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Categories request failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  async getCategories(): Promise<any> {
    const token = await this.getAccessToken();

    const url = 'https://giftcards-sandbox.reloadly.com/product-categories';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Categories request failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  async getProducts(
    size?: number,
    page?: number,
    productName?: string,
    countryCode?: string,
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const url = `https://giftcards-sandbox.reloadly.com/products?size=${size}&page=${page}&productName=${productName}&countryCode=${countryCode}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/com.reloadly.giftcards-v1+json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Product request failed (${response.status}): ${errText}`,
        );
      }

      return response.json();
    } catch (error) {
      throw new Error('Failed to fetch products');
    }
  }

  async getProductById(productId: string): Promise<any> {
    const token = await this.getAccessToken();

    const url = `https://giftcards-sandbox.reloadly.com/products/${productId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Product request failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  // continuation from here
  // async createOrder(dto: CreateOrderRequest): Promise<OrderResponseDto> {
  //   const token = await this.getAccessToken();

  //   const url = 'https://giftcards-sandbox.reloadly.com/orders';
  //   const requestBody = {
  //     productId: dto.productId,
  //     value: dto.value,
  //     quantity: 1,
  //     unitPrice: 5,
  //     customIdentifier: "1234ubvgc",
  //     recipient: {
  //       email: dto.recipientEmail,
  //       phone: dto.recipientPhone, // Optional
  //     },
  //     sender: {
  //       email: dto.senderEmail, // Optional
  //     },
  //     notification: {
  //       language: dto.notificationLanguage || 'en', // Default to English
  //     },
  //   };

  //   this.logger.log(
  //     `Creating gift card order for product ${dto.productId} worth ${dto.value}`,
  //   );

  //   const response = await fetch(url, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Accept: 'application/com.reloadly.giftcards-v1+json',
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify(requestBody),
  //   });

  //   if (!response.ok) {
  //     const errText = await response.text();
  //     throw new BadRequestException(
  //       `Order creation failed (${response.status}): ${errText}`,
  //     );
  //   }

  //   const orderData = (await response.json()) as OrderResponseDto;

  //   // Poll for redeem code if status is COMPLETED (optional; use webhooks in prod)
  //   if (orderData.status === 'COMPLETED') {
  //     await this.waitForRedeemCode(orderData.id, token);
  //     const updatedOrder = await this.getOrderById(orderData.id, token);
  //     return { ...orderData, ...updatedOrder }; // Merge for full details
  //   }

  //   return orderData;
  // }

  async createOrder(dto: CreateOrderRequest): Promise<OrderResponseDto> {
  const token = await this.getAccessToken();

  const url = 'https://giftcards-sandbox.reloadly.com/orders';

  // Validate unitPrice somehow (ideally fetch product first and check)
  if (!dto.unitPrice || dto.unitPrice <= 0) {
    throw new BadRequestException('unitPrice is required and must be positive');
  }

  const requestBody = {
    productId: dto.productId,
    quantity: dto.quantity || 1,          // Allow dynamic quantity
    unitPrice: dto.unitPrice,             // ← This MUST match an allowed denomination
    customIdentifier: `order-${Date.now()}`,
    recipient: {
      email: dto.recipientEmail,
      phone: dto.recipientPhone, // Optional
    },
    sender: {
      email: dto.senderEmail, // Optional
      // name: dto.senderName,   // Add if you have it (some examples use senderName)
    },
    notification: {
      language: dto.notificationLanguage || 'en',
    },
  };

  this.logger.log(
    `Creating gift card order for product ${dto.productId}, unitPrice ${dto.unitPrice}, qty ${requestBody.quantity}`,
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/com.reloadly.giftcards-v1+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    this.logger.error(`Reloadly order failed: ${errText}`);
    throw new BadRequestException(
      `Order creation failed (${response.status}): ${errText}`,
    );
  }

  const orderData = (await response.json()) as OrderResponseDto;

  // Your polling logic looks fine for sandbox/testing
  if (orderData.status === 'COMPLETED') {
    await this.waitForRedeemCode(orderData.id, token);
    const updatedOrder = await this.getOrderById(orderData.id, token);
    return { ...orderData, ...updatedOrder };
  }

  return orderData;
}

// async purchaseGiftCard(dto: CreateOrderRequest, userId: string) {
//   return this.txService.withTransaction(async (session) => {
//     const user = await this.userModel.findById(userId).session(session);
//     if(!user) throw new UnauthorizedException("Access denied!")
//     const sellingPriceNGN = this.calculateSellingPrice(dto); // your markup + face value in NGN

//     if (user.balance < sellingPriceNGN) throw new Error('Insufficient balance');

//     user.balance -= sellingPriceNGN;
//     await user.save({ session });

//     const pendingTx = await this.createPendingTx(userId, dto, sellingPriceNGN, session);

//     try {
//       const order = await this.createOrder(dto); // your Reloadly call

//       pendingTx.reloadlyOrderId = order.id;
//       pendingTx.status = 'processing';
//       await pendingTx.save({ session });

//       // Return order ID to frontend; delivery via webhook/poll later
//       return { success: true, orderId: order.id, message: 'Processing...' };
//     } catch (err) {
//       // Rollback on any Reloadly error
//       user.balance += sellingPriceNGN;
//       await user.save({ session });
//       throw err;
//     }
//   });
// }


async handleOrderCompleted(reloadlyOrderId: string) {
  const tx = await this.txModel.findOne({ reloadlyOrderId });
  if (!tx || tx.status !== 'processing') return;

  // Deliver code to recipient/user
  tx.status = 'completed';
  await tx.save();

  // Optionally notify user
}

  private async getOrderById(
    orderId: string,
    token: string,
  ): Promise<OrderResponseDto> {
    const url = `https://giftcards-sandbox.reloadly.com/orders/${orderId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new BadRequestException(
        `Order fetch failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  private async waitForRedeemCode(
    orderId: string,
    token: string,
    maxAttempts = 10,
    delay = 2000,
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const order = await this.getOrderById(orderId, token);
      if (order.redeemCode) return; // Code available
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.logger.warn(
      `Redeem code not available after ${maxAttempts} attempts for order ${orderId}`,
    );
  }

  async getRedeemInstructions(
    productId: string,
  ): Promise<RedeemInstructionsDto> {
    const token = await this.getAccessToken();

    // First, get product to extract brandId (or use brandId directly if known)
    const product = await this.getProductById(productId);
    const brandId = product.brandId || productId; // Fallback to productId if no brandId

    const url = `https://giftcards-sandbox.reloadly.com/redeem-instructions?brandId=${brandId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new BadRequestException(
        `Redeem instructions fetch failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }
}
