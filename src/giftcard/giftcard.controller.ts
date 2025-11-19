import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GiftcardService } from './giftcard.service';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryDto, CountryDto, CreateOrderDto, OrderResponseDto, ProductDto, RedeemInstructionsDto } from './dto/giftcard.dto';
import { AuthGuard } from 'src/guard/auth.guard';

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

@Get('products')
@HttpCode(200)
@ApiOperation({ summary: 'Get gift-card products with optional filters' })
@ApiQuery({
  name: 'size',
  required: false,
  type: Number,
  description: 'Number of items per page',
  example: 10,
})
@ApiQuery({
  name: 'page',
  required: false,
  type: Number,
  description: 'Page number (0-indexed)',
  example: 0,
})
@ApiQuery({
  name: 'productName',
  required: false,
  type: String,
  description: 'Filter by product name (partial match)',
  example: 'Amazon',
})
@ApiResponse({
  status: 200,
  description: 'List of products',
  type: [ProductDto], // or use a wrapper if paginated
})
@ApiResponse({ status: 404, description: 'Not found (if applicable)' })
@ApiResponse({ status: 500, description: 'External API error' })
async fetchProducts(
  @Query('size') size?: number,
  @Query('page') page?: number,
  @Query('productName') productName?: string,
) {
  return this.giftcardService.getProducts(size, page, productName);
}

  @Get('product/:productId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get gift-card details by product ID' })
  @ApiParam({
    name: 'productId',
    description: 'Unique identifier for the product',
    example: '12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details',
    type: ProductDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async fetchProductById(
    @Req() req: Request,
    @Param('productId') productId: string,
  ) {
    return this.giftcardService.getProductById(productId);
  } 


  // continuation 
  @Post('orders')
  @HttpCode(201)
  @UseGuards(AuthGuard) // Optional: Protect with auth to track user orders
  @ApiOperation({ summary: 'Purchase a gift card (create order)' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.giftcardService.createOrder(dto);
  }

  @Get('redeem-instructions/:productId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get redemption instructions for a product' })
  @ApiParam({
    name: 'productId',
    description: 'Product ID from /products',
    example: 'amazon-us-25',
  })
  @ApiResponse({
    status: 200,
    description: 'Redemption steps',
    type: RedeemInstructionsDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getRedeemInstructions(@Param('productId') productId: string) {
    return this.giftcardService.getRedeemInstructions(productId);
  }
}
