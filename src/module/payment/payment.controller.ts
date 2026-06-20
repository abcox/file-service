import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  //ParseBoolPipe,
  Post,
  Query,
} from '@nestjs/common';
import { StripeService } from './stripe/stripe.service';
import { Auth } from '../auth';
import { ProductDto } from './dto/product.dto';
import { ProductCreateDto } from './dto/product-create.dto';
import { ProductDetailDto } from './dto/product-detail.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import Stripe from 'stripe';
import { CustomerCreateRequestDto } from './dto/customer-create-request.dto';
import { PaymentIntentCreateRequestDto } from './dto/payment-intent-create-request.dto';
import { PaymentMethodListRequestDto } from './dto/payment-method-list-request.dto';
import { PaymentIntentListResponseDto } from './dto/payment-intent-list-response.dto';
import {
  CheckoutDraftCreateRequestDto,
  CheckoutDraftResponseDto,
  CheckoutDraftUpdateRequestDto,
  CheckoutInitRequestDto,
  CheckoutInitResponseDto,
  CheckoutStatusResponseDto,
} from './dto/checkout.dto';
import { PublicCatalogResponseDto } from './dto/public-catalog-response.dto';
import { PaymentCheckoutService } from './payment-checkout.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentCheckoutService: PaymentCheckoutService,
  ) {}

  //#region Public APIs

  //#region Public Checkout APIs

  @Get('catalog/public')
  @Auth({ public: true })
  @ApiOperation({ description: 'Get active sellable catalog items' })
  @ApiResponse({
    status: 200,
    description: 'Sellable catalog items',
    type: PublicCatalogResponseDto,
  })
  async getPublicCatalog(): Promise<PublicCatalogResponseDto> {
    return await this.paymentCheckoutService.getPublicCatalog();
  }

  @Post('checkout/draft')
  @Auth({ public: true })
  @ApiOperation({ description: 'Create a checkout draft' })
  @ApiBody({ type: CheckoutDraftCreateRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout draft created',
    type: CheckoutDraftResponseDto,
  })
  createCheckoutDraft(
    @Body() request: CheckoutDraftCreateRequestDto,
  ): CheckoutDraftResponseDto {
    return this.paymentCheckoutService.createDraft(request);
  }

  @Post('checkout/draft/:id/update')
  @Auth({ public: true })
  @ApiOperation({ description: 'Update a checkout draft' })
  @ApiBody({ type: CheckoutDraftUpdateRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout draft updated',
    type: CheckoutDraftResponseDto,
  })
  updateCheckoutDraft(
    @Param('id') id: string,
    @Body() request: CheckoutDraftUpdateRequestDto,
  ): CheckoutDraftResponseDto {
    return this.paymentCheckoutService.updateDraft(id, request);
  }

  @Post('checkout/init')
  @Auth({ public: true })
  @ApiOperation({
    description:
      'Initialize checkout: validate draft, compute total, and create payment intent',
  })
  @ApiBody({ type: CheckoutInitRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Checkout initialized for payment',
    type: CheckoutInitResponseDto,
  })
  async initializeCheckout(
    @Body() request: CheckoutInitRequestDto,
  ): Promise<CheckoutInitResponseDto> {
    return await this.paymentCheckoutService.initializeCheckout(request);
  }

  @Get('checkout/:id/status')
  @Auth({ public: true })
  @ApiOperation({ description: 'Get public-safe checkout status' })
  @ApiResponse({
    status: 200,
    description: 'Checkout status',
    type: CheckoutStatusResponseDto,
  })
  async getCheckoutStatus(
    @Param('id') id: string,
  ): Promise<CheckoutStatusResponseDto> {
    return await this.paymentCheckoutService.getCheckoutStatus(id);
  }

  //#endregion Public Checkout APIs

  @Get('balance/detail')
  @ApiOperation({ description: 'Get balance detail' })
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getStripeBalanceDetail(): Promise<Stripe.Balance> {
    return await this.stripeService.getBalance();
  }

  @Get('balance/transaction/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getStripeBalanceTransactions(
    @Query() params?: Stripe.BalanceTransactionListParams,
  ): Promise<Stripe.BalanceTransaction[]> {
    return await this.stripeService.getBalanceTransactionList(params);
  }

  @Get('charge/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getChargeList(
    @Query() params?: Stripe.ChargeListParams,
  ): Promise<Stripe.Charge[]> {
    return await this.stripeService.getChargeList(params);
  }

  @Get('charge/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Get charge detail by ID' })
  @ApiParam({ name: 'id', description: 'Charge ID' })
  async getCharge(@Param('id') id: string): Promise<Stripe.Charge> {
    return await this.stripeService.getCharge(id);
  }

  //#region Customer

  @Get('customer/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getCustomerList() {
    return await this.stripeService.getCustomerList();
  }

  @Get('customer/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiProperty({ description: 'Get customer details by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  async getCustomerDetail(@Param('id') id: string) {
    return await this.stripeService.getCustomerDetail(id);
  }

  @Delete('customer/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async deleteCustomer(@Param('id') id: string): Promise<void> {
    await this.stripeService.deleteCustomer(id);
  }

  @Post('customer/create')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Create a new customer' })
  async createCustomer(
    @Body() params: CustomerCreateRequestDto,
  ): Promise<Stripe.Customer> {
    const response = await this.stripeService.createCustomer(params);
    return response;
  }

  //#endregion Customer

  //#region Payment

  @Post('intent/create')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Create a payment intent' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
    type: Object,
  })
  async createPaymentIntent(
    @Body()
    request: PaymentIntentCreateRequestDto,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.createPaymentIntent(request);
    return response;
  }

  // IMPORTANT:  this route must be ordered before the route with :id param to avoid conflict
  @Get('intent/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiResponse({
    status: 200,
    description: 'List of payment intents',
    type: PaymentIntentListResponseDto,
  })
  @ApiOperation({
    description: 'List payment intents',
    operationId: 'getPaymentIntentList',
  })
  async getPaymentIntentList(
    @Query() params?: Stripe.PaymentIntentListParams,
  ): Promise<PaymentIntentListResponseDto> {
    const response = await this.stripeService.getPaymentIntentList(params);
    return response;
  }

  @Get('intent/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Retrieve a payment intent by ID' })
  async retrievePaymentIntent(
    @Param('id') id: string,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.getPaymentIntent(id);
    return response;
  }

  @Get('intent/search')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Search payment intents' })
  async searchPaymentIntents(
    @Query('query') query: string,
    @Query() options?: Stripe.PaymentIntentSearchParams,
  ): Promise<Stripe.PaymentIntent[]> {
    const response = await this.stripeService.searchPaymentIntents(
      query,
      options,
    );
    return response;
  }

  @Delete('intent/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Cancel a payment intent by ID' })
  async cancelPaymentIntent(
    @Param('id') id: string,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.cancelPaymentIntent(id);
    return response;
  }

  @Post('intent/:id/confirm')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Confirm a payment intent by ID' })
  async confirmPaymentIntent(
    @Param('id') id: string,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.confirmPaymentIntent(id);
    return response;
  }

  @Post('intent/:id/capture')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Capture a payment intent by ID' })
  async capturePaymentIntent(
    @Param('id') id: string,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.capturePaymentIntent(id);
    return response;
  }

  @Post('intent/:id/refund')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Refund a payment intent by ID' })
  async refundPaymentIntent(@Param('id') id: string): Promise<Stripe.Refund> {
    const response = await this.stripeService.refundPaymentIntent(id);
    return response;
  }

  @Post('intent/:id/update')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Update a payment intent by ID' })
  async updatePaymentIntent(
    @Param('id') id: string,
    @Body() params: Stripe.PaymentIntentUpdateParams,
  ): Promise<Stripe.PaymentIntent> {
    const response = await this.stripeService.updatePaymentIntent(id, params);
    return response;
  }

  @Get('method/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getPaymentMethodList(
    @Query() params: PaymentMethodListRequestDto,
  ): Promise<Stripe.PaymentMethod[]> {
    const response = await this.stripeService.getPaymentMethodList(params);
    return response;
  }

  @Get('method/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiOperation({ description: 'Retrieve a payment method by ID' })
  async retrievePaymentMethod(
    @Param('id') id: string,
  ): Promise<Stripe.PaymentMethod> {
    const response = await this.stripeService.getPaymentMethod(id);
    return response;
  }

  //#endregion Payment

  //#region Price

  @Get('price/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getPriceList() {
    return await this.stripeService.getPriceList();
  }

  //#endregion Price

  //#region Product

  @Get('product/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getProductList() {
    return await this.stripeService.getProductList();
  }

  @Get('product/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  @ApiProperty({ description: 'Get product details by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({
    type: Boolean,
    name: 'includePriceList',
    description: 'Include price list',
    required: false,
    //example: false,
  })
  async getProduct(
    @Param('id') id: string,
    @Query('includePriceList')
    includePriceList: string | undefined, // IMPORTANT: using string to provide conversion to boolean
  ): Promise<ProductDetailDto> {
    const response = await this.stripeService.getProductDetail(
      id,
      includePriceList === 'true' ? true : false,
    );
    return response;
  }

  @Get('product/:id/price/list')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async getProductPriceList(@Param('id') id: string) {
    return await this.stripeService.getPriceList({ product: id });
  }

  @Delete('product/:id')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async deleteProduct(@Param('id') id: string): Promise<void> {
    await this.stripeService.deleteProduct(id);
  }

  @Post('product/create')
  //@Auth({ public: true })
  @Auth({ roles: ['admin'] })
  async createProduct(@Body() product: ProductCreateDto): Promise<ProductDto> {
    const response = await this.stripeService.createProduct(
      new ProductCreateDto(product),
    );
    return response;
  }

  //#endregion Product

  //#endregion Public APIs
}
