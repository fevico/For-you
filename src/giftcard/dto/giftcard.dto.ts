import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CountryDto {

  @ApiProperty({
    description: 'Full country name',
    example: 'United States',
  })
  name: string;

  @ApiProperty({
    description: 'Currency code used for gift-cards',
    example: 'USD',
  })
  currencyCode: string;
}

export class CategoryDto {
  @ApiProperty({
    example: 1,
    description: 'Category unique identifier',
  })
  id: number;

  @ApiProperty({
    example: 'Digital',
    description: 'Category name',
  })
  name: string;
}

export class ProductDto {
  @ApiProperty({
    example: 12345,
    description: 'Product unique identifier',
  })
  id: number;

  @ApiProperty({
    example: 'Amazon Gift Card',
    description: 'Product name',
  })
  name: string;

  @ApiProperty({
    example: 'Amazon',
    description: 'Brand name',
  })
  brandName: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  currencyCode: string;

  @ApiProperty({
    example: [25, 50, 100],
    type: [Number],
    description: 'Available denominations for this product',
  })
  denominations: number[];
}

// New DTOs for orders and redemption
export class CreateOrderDto {
  @ApiProperty({
    example: 'amazon-us-25',
    description: 'Product ID from /products endpoint',
  })
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({
    example: "$4",
    description: 'Unit price',
  })
  @IsNumber()
  @IsNotEmpty()
  unitPrice: number;

  @ApiProperty({
    example: "2",
    description: 'Quantity of product',
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Recipient email for delivery',
  })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description:
      'Recipient phone for SMS delivery (optional; use E.164 format)',
  })
  @ValidateIf((o) => !o.recipientEmail) // Required if no email
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: 'sender@example.com',
    description: 'Sender email (optional, for notifications)',
  })
  @IsOptional()
  @IsEmail()
  senderEmail?: string;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Notification language (e.g., en, es, fr; default: en)',
  })
  @IsOptional()
  @IsString()
  notificationLanguage?: string;
}

export class OrderResponseDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Order unique identifier',
  })
  id: string;

  @ApiProperty({
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    description: 'Current order status',
  })
  status: string;

  @ApiProperty({
    example: 'amazon-us-25',
    description: 'Product ID from catalog',
  })
  productId: string;

  @ApiProperty({
    example: 50,
    description: 'Order value in currency units',
  })
  value: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  currencyCode: string;

  @ApiPropertyOptional({
    example: 'recipient@example.com',
    description: 'Recipient email address',
  })
  recipientEmail?: string;

  @ApiPropertyOptional({
    example: '+11234567890',
    description: 'Recipient phone number (E.164 format)',
  })
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: 'sender@example.com',
    description: 'Sender email address',
  })
  senderEmail?: string;

  @ApiPropertyOptional({
    example: 'CLAIM123456789',
    description: 'Gift card claim/redemption code',
  })
  redeemCode?: string;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Separate PIN if required',
  })
  redeemPin?: string;

  @ApiPropertyOptional({
    description: 'Delivery and redemption instructions',
  })
  deliveryInstructions?: string;

  @ApiProperty({
    example: '2025-01-19T10:30:00Z',
    description: 'Order creation timestamp',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    example: '2025-01-19T10:35:00Z',
    description: 'Order last update timestamp',
  })
  updatedAt?: Date;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Notification language code',
  })
  notificationLanguage?: string;
}

export class RedeemInstructionsDto {
  @ApiProperty({
    type: [String],
    example: [
      'Visit amazon.com/redeem',
      'Enter your claim code',
      'Apply to your account',
    ],
    description: 'Step-by-step redemption instructions',
  })
  steps: string[];

  @ApiPropertyOptional({
    example: 'https://www.amazon.com/redeem',
    description: 'URL where the gift card can be redeemed',
  })
  redemptionUrl?: string;

  @ApiPropertyOptional({
    example: 'Code expires in 1 year. Valid only in US.',
    description: 'Additional information or terms',
  })
  additionalInfo?: string;

  @ApiPropertyOptional({
    example: 'amazon',
    description: 'Brand name for the gift card',
  })
  brandName?: string;
}
