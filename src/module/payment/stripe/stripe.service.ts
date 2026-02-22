import { Injectable, Logger } from '@nestjs/common';
import { Stripe } from 'stripe';
import { AppConfigService } from '../../config/config.service';
import { ProductDto } from '../dto/product.dto';
import { ProductCreateDto } from '../dto/product-create.dto';
import { ProductDetailDto } from '../dto/product-detail.dto';
import { PaymentIntentCreateRequestDto } from '../dto/payment-intent-create-request.dto';
import { PaymentMethodListRequestDto } from '../dto/payment-method-list-request.dto';
import { PaymentIntentListResponseDto } from '../dto/payment-intent-list-response.dto';
import { StripePaymentIntentDto } from '../dto/stripe-payment-intent.dto';
import { DiagnosticProvider } from '../../diagnostic/diagnostic-provider.interface';
import { DiagnosticService } from '../../diagnostic/diagnostic.service';
import { ServiceStatusDto } from '../../diagnostic/dto/service-status.dto';

export interface StripeOptions {
  key: string;
  secret: string;
  version: string;
}

@Injectable()
export class StripeService implements DiagnosticProvider {
  private _stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private appConfigService: AppConfigService,
    private diagnosticService: DiagnosticService,
  ) {
    // Register with diagnostic service
    this.diagnosticService.registerProvider('stripe', this);
  }

  /**
   * DiagnosticProvider implementation
   */
  getDiagnosticStatus(): ServiceStatusDto {
    const stripeConfig = this.appConfigService.getConfig()?.payment?.stripe;
    const { key, secret, version } = stripeConfig || {};

    if (!stripeConfig) {
      return {
        name: 'stripe',
        status: 'unavailable',
        reason: 'Missing payment.stripe config section',
        timestamp: new Date().toISOString(),
      };
    }

    if (!key || !secret) {
      return {
        name: 'stripe',
        status: 'unavailable',
        reason: 'Missing Stripe API key or secret',
        details: { hasKey: !!key, hasSecret: !!secret, hasVersion: !!version },
        timestamp: new Date().toISOString(),
      };
    }

    if (!version) {
      return {
        name: 'stripe',
        status: 'degraded',
        reason: 'Stripe API version not specified',
        details: { hasKey: true, hasSecret: true, hasVersion: false },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: 'stripe',
      status: 'ready',
      details: { hasKey: true, hasSecret: true, hasVersion: true },
      timestamp: new Date().toISOString(),
    };
  }

  private get client(): Stripe | null {
    if (this._stripe) {
      return this._stripe;
    }
    const { key, secret, version } =
      this.appConfigService.getConfig()?.payment?.stripe || {};
    if (!key || !secret || !version) {
      this.logger.warn(
        'Stripe configuration is missing - payment features will be unavailable',
      );
      return null;
    }

    // initialize Stripe client
    this._stripe = new Stripe(secret, {
      //key: key,
      apiVersion: '2025-12-15.clover',
    } as Stripe.StripeConfig);
    this.logger.log('Stripe service initialized successfully');

    return this._stripe;
  }

  async getAccount(): Promise<Stripe.Account | undefined> {
    const account = await this.client?.accounts.retrieve();
    return account;
  }

  async getBalance(): Promise<Stripe.Balance> {
    const balance = await this.client?.balance.retrieve();
    if (!balance) {
      throw new Error('Failed to retrieve balance');
    }
    return balance;
  }

  async getBalanceTransactionList(
    params?: Stripe.BalanceTransactionListParams,
  ): Promise<Stripe.BalanceTransaction[]> {
    const balanceTransactions = await this.client?.balanceTransactions.list(
      params || {},
    );
    return balanceTransactions?.data || [];
  }

  async getChargeList(
    params?: Stripe.ChargeListParams,
  ): Promise<Stripe.Charge[]> {
    const charges = await this.client?.charges.list(params || {});
    return charges?.data || [];
  }

  async getCharge(id: string): Promise<Stripe.Charge> {
    const charge = await this.client?.charges.retrieve(id);
    if (!charge) {
      throw new Error('Failed to retrieve charge details');
    }
    return charge;
  }

  //#region Customer

  async getCustomerList(): Promise<Stripe.Customer[]> {
    const customers = await this.client?.customers.list();
    if (!customers) {
      throw new Error('Failed to retrieve customer list');
    }
    return customers?.data || [];
  }

  async getCustomerDetail(
    id: string,
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const customer = await this.client?.customers.retrieve(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async getCustomerByEmail(
    email: string,
  ): Promise<Stripe.Customer | undefined> {
    const customers = await this.client?.customers.list({ email: email });
    if (!customers || customers.data.length === 0) {
      return undefined;
    }
    return customers.data[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.client?.customers.del(id);
  }

  async createCustomer(
    params: Stripe.CustomerCreateParams,
  ): Promise<Stripe.Customer> {
    const customer = await this.client?.customers.create(params);
    if (!customer) {
      throw new Error('Failed to create customer');
    }
    return customer;
  }

  //#endregion Customer

  //#region Payment

  // Create a payment intent
  // Ref: https://stripe.com/docs/api/payment_intents/create
  // A payment intent represents your intent to collect payment and
  // includes details about the transaction.
  async createPaymentIntent(
    request: PaymentIntentCreateRequestDto,
  ): Promise<Stripe.PaymentIntent> {
    //const { return_url } = request;
    let customer = await this.getCustomerByEmail(request.receipt_email);
    if (!customer) {
      customer = await this.client?.customers.create({
        email: request.receipt_email,
      });
      if (!customer || !customer.id) {
        throw new Error('Failed to create customer for payment intent');
      }
    }
    //request.customerId = customer.id;
    const transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const params = {
      ...request,
      metadata: {
        transactionId: transactionId,
      },
      customer: customer.id,
      // default:
      /* automatic_payment_methods: {
        enabled: true,
      }, */
    } as Stripe.PaymentIntentCreateParams;
    /* if (return_url) {
      params.return_url = `${return_url}?transactionId=${transactionId}`;
      params.confirm = true;
      params.confirmation_method = 'manual' as
        | 'automatic'
        | 'manual'
        | undefined;
    } */
    const paymentIntent = await this.client?.paymentIntents.create(params);
    if (!paymentIntent) {
      throw new Error('Failed to create payment intent');
    }
    console.log('Created payment intent:', paymentIntent);
    return paymentIntent;
  }

  async getPaymentMethodList(
    request: PaymentMethodListRequestDto,
  ): Promise<Stripe.PaymentMethod[]> {
    console.log('Getting payment methods with request:', request);
    const params = {
      type: request.type || 'card',
      customer: request.customerId || '',
    } as Stripe.PaymentMethodListParams;
    if (!params.customer) {
      delete params.customer;
    }
    console.log('Getting payment methods with params:', params);
    const paymentMethods = await this.client?.paymentMethods.list(params);
    return paymentMethods?.data || [];
  }

  async getPaymentMethod(id: string): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.client?.paymentMethods.retrieve(id);
    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }
    return paymentMethod;
  }

  // Retrieve a payment intent // i.e pi_3SmFiHLm8WjfqU8o076ZKdtu
  async getPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.client?.paymentIntents.retrieve(id);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }
    return paymentIntent;
  }

  async cancelPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.client?.paymentIntents.cancel(id);
    if (!paymentIntent) {
      throw new Error('Failed to cancel payment intent');
    }
    return paymentIntent;
  }

  async confirmPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.client?.paymentIntents.confirm(id);
    if (!paymentIntent) {
      throw new Error('Failed to confirm payment intent');
    }
    return paymentIntent;
  }

  async capturePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.client?.paymentIntents.capture(id);
    if (!paymentIntent) {
      throw new Error('Failed to capture payment intent');
    }
    return paymentIntent;
  }

  async refundPaymentIntent(id: string): Promise<Stripe.Refund> {
    const refund = await this.client?.refunds.create({
      payment_intent: id,
    });
    if (!refund) {
      throw new Error('Failed to create refund');
    }
    return refund;
  }

  async searchPaymentIntents(
    query: string,
    options?: Stripe.PaymentIntentSearchParams,
  ): Promise<Stripe.PaymentIntent[]> {
    console.log(`Searching payment intents with query`, query, options);
    const paymentIntents = await this.client?.paymentIntents.search({
      query: query,
      ...options,
    });
    if (!paymentIntents) {
      throw new Error('Failed to search payment intents');
    }
    return paymentIntents.data;
  }

  async updatePaymentIntent(
    id: string,
    params: Stripe.PaymentIntentUpdateParams,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.client?.paymentIntents.update(id, params);
    if (!paymentIntent) {
      throw new Error('Failed to update payment intent');
    }
    return paymentIntent;
  }

  // todo: implement pagination
  async getPaymentIntentList(
    params?: Stripe.PaymentIntentListParams,
  ): Promise<PaymentIntentListResponseDto> {
    const paymentIntents = await this.client?.paymentIntents.list(params || {});
    if (!paymentIntents) {
      throw new Error('Failed to list payment intents');
    }
    return {
      list: paymentIntents.data.map((pi) => new StripePaymentIntentDto(pi)),
      total: paymentIntents.data.length,
    };
  }

  //#endregion Payment

  //#region Product

  async getProductList(): Promise<Stripe.Product[]> {
    const products = await this.client?.products.list();
    if (!products) {
      throw new Error('Failed to list products');
    }
    return products.data;
  }

  async getProductDetail(
    id: string,
    includePriceList?: boolean,
  ): Promise<ProductDetailDto> {
    console.log(
      'Getting product detail for ID:',
      id,
      'Include price list:',
      includePriceList,
    );
    const result: ProductDetailDto = { product: undefined };
    const product = await this.client?.products.retrieve(id);
    if (!product) {
      throw new Error('Product not found');
    }
    result.product = product;
    console.log('Type:', typeof includePriceList, 'Value:', includePriceList);
    if (!includePriceList) {
      console.log('Not including price list for product:', id);
      return result;
    }
    /* if (!(includePriceList === true || includePriceList === 'true')) {
      console.log('Not including price list for product:', id);
      return result;
    } */
    console.log('Including price list for product:', id);
    const prices = await this.client?.prices.list({ product: id });
    if (!prices) {
      throw new Error('Failed to list prices for product');
    }
    console.log('Found prices:', prices.data);
    result.priceList = prices.data;

    return result;
  }

  async createProduct(dto: ProductCreateDto): Promise<ProductDto> {
    const productResponse = await this.client?.products.create(
      dto.toStripeProductCreateParams(),
    );
    if (!productResponse || !productResponse.id) {
      throw new Error('Failed to create product');
    }
    const productDto = new ProductDto({
      name: productResponse.name,
      description: productResponse.description || '',
      price: dto.price,
      id: productResponse.id,
    });
    const priceDto = dto.toStripePriceCreateParams(productDto.id);
    const priceResponse = await this.client?.prices.create(priceDto);
    if (!priceResponse || !priceResponse.id) {
      throw new Error('Failed to create price for product');
    }
    return productDto;
  }

  async deleteProduct(id: string): Promise<void> {
    const deleted = await this.client?.products.del(id);
    if (!deleted) {
      throw new Error('Failed to delete product');
    }
  }

  //#endregion Product

  //#region Price

  async getPriceList(options?: { product?: string }): Promise<Stripe.Price[]> {
    const prices = await this.client?.prices.list(options || {});
    if (!prices) {
      throw new Error('Failed to list prices');
    }
    return prices.data;
  }

  //#endregion Price

  // Handle Stripe webhook events
  async handleWebhook(/* params */): Promise<any> {
    // TODO: Implement
  }
}
