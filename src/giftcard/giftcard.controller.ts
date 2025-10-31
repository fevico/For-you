import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Req,
} from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryDto, CountryDto } from './dto/giftcard.dto';

@Controller('giftcard')
@ApiTags('Giftcard')
export class GiftcardController {
  constructor(private readonly giftcardService: GiftcardService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List all countries that support gift-cards' })
  @ApiResponse({
    status: 200,
    description: 'Array of countries',
    type: [CountryDto],
  })
  @ApiResponse({ status: 401, description: 'Invalid/expired token' })
  async fetchCountries(@Req() req: Request) {
    return this.giftcardService.getCountries();
  }

  @Get(':countryCode')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get gift-card details for a specific country' })
  @ApiParam({
    name: 'countryCode',
    description: 'ISO-3166-1 alpha-2 code (e.g. US, GB, NG)',
    example: 'US',
  })
  @ApiResponse({
    status: 200,
    description: 'Country details',
    type: CountryDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid country code' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async fetchByCountryCode(
    @Req() req: Request,
    @Param('countryCode') countryCode: string,
  ) {
    if (!countryCode || countryCode.length !== 2) {
      throw new BadRequestException('countryCode must be a 2-letter ISO code');
    }
    return this.giftcardService.getByCountryCode(countryCode.toUpperCase());
  }
  @Get('categories')
  @HttpCode(200)
  @ApiOperation({ summary: 'List all gift-card categories' })
  @ApiResponse({
    status: 200,
    description: 'Array of categories',
    type: [CategoryDto],
  })
  async fetchCategories(@Req() req: Request) {
    return this.giftcardService.getCategories();
  }
}
