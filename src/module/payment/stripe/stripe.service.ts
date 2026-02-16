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

export interface StripeOptions {
  key: string;
  secret: string;
  version: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private appConfigService: AppConfigService) {
    const { key, secret, version } =
      this.appConfigService.getConfig()?.payment?.stripe || {};
    if (!key || !secret || !version) {
      throw new Error('Stripe configuration is missing');
    }
    this.stripe = new Stripe(secret, {
      //key: key,
      apiVersion: '2025-12-15.clover',
    } as Stripe.StripeConfig);
  }

  async getAccount(): Promise<Stripe.Account> {
    const account = await this.stripe.accounts.retrieve();
    return account;
  }

  async getBalance(): Promise<Stripe.Balance> {
    const balance = await this.stripe.balance.retrieve();
    return balance;
  }

  async getBalanceTransactionList(
    params?: Stripe.BalanceTransactionListParams,
  ): Promise<Stripe.BalanceTransaction[]> {
    const balanceTransactions = await this.stripe.balanceTransactions.list(
      params || {},
    );
    return balanceTransactions.data;
  }

  async getChargeList(
    params?: Stripe.ChargeListParams,
  ): Promise<Stripe.Charge[]> {
    const charges = await this.stripe.charges.list(params || {});
    return charges.data;
  }

  async getCharge(id: string): Promise<Stripe.Charge> {
    const charge = await this.stripe.charges.retrieve(id);
    return charge;
  }

  //#region Customer

  async getCustomerList(): Promise<Stripe.Customer[]> {
    const customers = await this.stripe.customers.list();
    return customers.data;
  }

  async getCustomerDetail(
    id: string,
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const customer = await this.stripe.customers.retrieve(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  async getCustomerByEmail(
    email: string,
  ): Promise<Stripe.Customer | undefined> {
    const customers = await this.stripe.customers.list({ email: email });
    return customers.data.length > 0 ? customers.data[0] : undefined;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.stripe.customers.del(id);
  }

  async createCustomer(
    params: Stripe.CustomerCreateParams,
  ): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create(params);
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
      customer = await this.stripe.customers.create({
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
    const paymentIntent = await this.stripe.paymentIntents.create(params);
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
    const paymentMethods = await this.stripe.paymentMethods.list(params);
    return paymentMethods.data;
  }

  async getPaymentMethod(id: string): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await this.stripe.paymentMethods.retrieve(id);
    return paymentMethod;
  }

  // Retrieve a payment intent // i.e pi_3SmFiHLm8WjfqU8o076ZKdtu
  async getPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
    return paymentIntent;
  }

  async cancelPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.cancel(id);
    return paymentIntent;
  }

  async confirmPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.confirm(id);
    return paymentIntent;
  }

  async capturePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.capture(id);
    return paymentIntent;
  }

  async refundPaymentIntent(id: string): Promise<Stripe.Refund> {
    const refund = await this.stripe.refunds.create({
      payment_intent: id,
    });
    return refund;
  }

  async searchPaymentIntents(
    query: string,
    options?: Stripe.PaymentIntentSearchParams,
  ): Promise<Stripe.PaymentIntent[]> {
    console.log(`Searching payment intents with query`, query, options);
    const paymentIntents = await this.stripe.paymentIntents.search({
      query: query,
      ...options,
    });
    return paymentIntents.data;
  }

  async updatePaymentIntent(
    id: string,
    params: Stripe.PaymentIntentUpdateParams,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.update(id, params);
    return paymentIntent;
  }

  // todo: implement pagination
  async getPaymentIntentList(
    params?: Stripe.PaymentIntentListParams,
  ): Promise<PaymentIntentListResponseDto> {
    const paymentIntents = await this.stripe.paymentIntents.list(params || {});
    return {
      list: paymentIntents.data.map((pi) => new StripePaymentIntentDto(pi)),
      total: paymentIntents.data.length,
    };
  }

  //#endregion Payment

  //#region Product

  async getProductList(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list();
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
    const product = await this.stripe.products.retrieve(id);
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
    const prices = await this.stripe.prices.list({ product: id });
    console.log('Found prices:', prices.data);
    result.priceList = prices.data;

    return result;
  }

  async createProduct(dto: ProductCreateDto): Promise<ProductDto> {
    const productResponse = await this.stripe.products.create(
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
    const priceResponse = await this.stripe.prices.create(priceDto);
    if (!priceResponse || !priceResponse.id) {
      throw new Error('Failed to create price for product');
    }
    return productDto;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.stripe.products.del(id);
  }

  //#endregion Product

  //#region Price

  async getPriceList(options?: { product?: string }): Promise<Stripe.Price[]> {
    const prices = await this.stripe.prices.list(options || {});
    return prices.data;
  }

  //#endregion Price

  // Handle Stripe webhook events
  async handleWebhook(/* params */): Promise<any> {
    // TODO: Implement
  }
}
