export class HitPayPaymentPayload {
  amount: number;
  currency?: string;
  email: string;
  referenceNumber: string;
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
}

export class HitPayPaymentResponse {
  id: string;
  url: string;
  status: string;
}

