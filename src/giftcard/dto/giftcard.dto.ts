import { ApiProperty } from '@nestjs/swagger';

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