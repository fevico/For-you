import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CountryDto {
  @ApiProperty({ description: 'ISO-3166-1 alpha-2 country code', example: 'US' })
  countryCode: string;

  @ApiProperty({ description: 'Full country name', example: 'United States' })
  name: string;

  @ApiProperty({ description: 'Currency code used for gift-cards', example: 'USD' })
  currencyCode: string;

  // …add any other fields that the real API returns
}

export class CategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Digital' })
  name: string;
}

export class ProductDto {
  @ApiProperty({ example: 12345 })
  id: number;
  @ApiProperty({ example: 'Amazon Gift Card' })
  name: string;
  @ApiProperty({ example: 'Amazon' })
  brandName: string;
  @ApiProperty({ example: 'USD' })
  currencyCode: string;
  @ApiProperty({ example: [25, 50, 100] })
  denominations: number[];
}


// New DTOs for orders and redemption
export class CreateOrderDto {
  @ApiProperty({ 
    example: 'amazon-us-25', 
    description: 'Product ID from /products endpoint' 
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ 
    example: 50, 
    description: 'Value in local currency (must match product denomination)' 
  })
  @IsNumber()
  @Min(1)
  value: number;

  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Recipient email for delivery' 
  })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @ApiPropertyOptional({ 
    example: '+1234567890', 
    description: 'Recipient phone for SMS delivery (optional; use E.164 format)' 
  })
  @ValidateIf(o => !o.recipientEmail) // Required if no email
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({ 
    example: 'sender@example.com', 
    description: 'Sender email (optional, for notifications)' 
  })
  @IsOptional()
  @IsEmail()
  senderEmail?: string;

  @ApiPropertyOptional({ 
    example: 'en', 
    description: 'Notification language (e.g., en, es, fr; default: en)' 
  })
  @IsOptional()
  @IsString()
  notificationLanguage?: string;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status: string;
  @ApiProperty() productId: string;
  @ApiProperty() value: number;
  @ApiProperty() currencyCode: string;
  @ApiProperty() recipientEmail?: string;
  @ApiPropertyOptional() recipientPhone?: string;
  @ApiPropertyOptional() senderEmail?: string;
  @ApiPropertyOptional() redeemCode?: string; // PIN or claim code
  @ApiPropertyOptional() redeemPin?: string; // If separate PIN
  @ApiPropertyOptional() deliveryInstructions?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt?: Date;
  @ApiProperty() notificationLanguage?: string;
}

export class RedeemInstructionsDto {
  @ApiProperty({ type: [String], example: ['Visit amazon.com/redeem', 'Enter your claim code', 'Apply to your account'] })
  steps: string[];

  @ApiPropertyOptional({ example: 'https://www.amazon.com/redeem' })
  redemptionUrl?: string;

  @ApiPropertyOptional({ example: 'Code expires in 1 year. Valid only in US.' })
  additionalInfo?: string;

  @ApiPropertyOptional({ example: 'amazon' })
  brandName?: string;
}