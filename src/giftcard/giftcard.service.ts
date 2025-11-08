import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ReloadlyToken {
  access_token: string;
  expires_in: number;   // seconds
  scope: string;
  token_type: string;
}

@Injectable()
export class GiftcardService {
    private readonly logger = new Logger(GiftcardService.name);

  // In-memory token cache
  private token: ReloadlyToken | null = null;
  private tokenExpiresAt: number = 0; // epoch ms
constructor(private readonly config: ConfigService) {}

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

  /** ------------------------------------------------------------------
   *  Public method – list countries
   *  ------------------------------------------------------------------ */
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
      throw new Error(`Countries request failed (${response.status}): ${errText}`);
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
      throw new Error(`Categories request failed (${response.status}): ${errText}`);
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
      throw new Error(`Categories request failed (${response.status}): ${errText}`);
    }

    return response.json();
  }

  async getProducts(size?: number, page?: number, productName?: string): Promise<any> {

    try {
          const token = await this.getAccessToken();
    const url = `https://giftcards-sandbox.reloadly.com/products?size=${size}&page=${page}&productName=${productName}&countryCode=US`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/com.reloadly.giftcards-v1+json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Product request failed (${response.status}): ${errText}`);
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
      throw new Error(`Product request failed (${response.status}): ${errText}`);
    }

    return response.json();
  }
}