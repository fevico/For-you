import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class HitPayPaymentPayload {
  @ApiProperty({
    example: 100.5,
    description: 'Payment amount in the specified currency',
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Currency code (default: USD)',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Customer email address',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'https://example.com/success',
    description: 'URL to redirect after successful payment',
  })
  @IsUrl()
  @IsOptional()
  redirectUrl?: string;;

  @ApiPropertyOptional({
    example: 'Wallet funding',
    description: 'Payment description',
  })
  @IsString()
  @IsOptional()
  purpose?: string;
}

export class HitPayPaymentResponse {
  @ApiProperty({
    example: 'payment_12345678',
    description: 'Unique payment ID',
  })
  id: string;

  @ApiProperty({
    example: 'https://payment.hitpay.io/pay/payment_12345678',
    description: 'Payment gateway URL',
  })
  url: string;

  @ApiProperty({
    example: 'pending',
    description: 'Payment status (pending, completed, failed)',
  })
  status: string;
}
