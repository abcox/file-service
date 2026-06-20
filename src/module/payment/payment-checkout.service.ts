import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { StripeService } from './stripe/stripe.service';
import {
  CheckoutDraftCreateRequestDto,
  CheckoutDraftResponseDto,
  CheckoutDraftUpdateRequestDto,
  CheckoutInitRequestDto,
  CheckoutInitResponseDto,
  CheckoutLineItemDto,
  CheckoutStatusResponseDto,
} from './dto/checkout.dto';
import {
  PublicCatalogItemDto,
  PublicCatalogPriceDto,
  PublicCatalogResponseDto,
} from './dto/public-catalog-response.dto';

interface StoredCheckoutDraft {
  id: string;
  status: 'draft' | 'ready_to_pay' | 'paid' | 'failed';
  receiptEmail: string;
  items: CheckoutLineItemDto[];
  amount?: number;
  currency?: string;
  paymentIntentId?: string;
}

@Injectable()
export class PaymentCheckoutService {
  private readonly drafts = new Map<string, StoredCheckoutDraft>();
  private readonly initByIdempotencyKey = new Map<
    string,
    CheckoutInitResponseDto
  >();

  constructor(private readonly stripeService: StripeService) {}

  async getPublicCatalog(): Promise<PublicCatalogResponseDto> {
    const [products, prices] = await Promise.all([
      this.stripeService.getProductList(),
      this.stripeService.getPriceList(),
    ]);

    const activePricesByProduct = new Map<string, Stripe.Price[]>();
    for (const price of prices) {
      if (!price.active || !price.product || !price.unit_amount) {
        continue;
      }
      const productId = StripeService.getNormalizedStripeObjectId(
        price.product,
      );
      if (!productId) continue;
      const productPrices = activePricesByProduct.get(productId) || [];
      productPrices.push(price);
      activePricesByProduct.set(productId, productPrices);
    }

    const items: PublicCatalogItemDto[] = products
      .filter((product) => product.active)
      .map((product) => {
        const productPrices = activePricesByProduct.get(product.id) || [];
        const mappedPrices: PublicCatalogPriceDto[] = productPrices.map(
          (price) => ({
            id: price.id,
            currency: price.currency,
            unitAmount: price.unit_amount || 0,
            interval: price.recurring?.interval,
          }),
        );

        return {
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          defaultPriceId:
            typeof product.default_price === 'string'
              ? product.default_price
              : undefined,
          prices: mappedPrices,
        };
      })
      .filter((item) => item.prices.length > 0);

    return { items };
  }

  createDraft(
    request: CheckoutDraftCreateRequestDto,
  ): CheckoutDraftResponseDto {
    this.validateReceiptEmail(request.receiptEmail);
    this.validateItems(request.items);

    const id = `chk_${randomUUID()}`;
    const draft: StoredCheckoutDraft = {
      id,
      status: 'draft',
      receiptEmail: request.receiptEmail.trim(),
      items: request.items,
    };
    this.drafts.set(id, draft);

    return this.toDraftResponse(draft);
  }

  updateDraft(
    draftId: string,
    request: CheckoutDraftUpdateRequestDto,
  ): CheckoutDraftResponseDto {
    const draft = this.getDraftOrThrow(draftId);
    if (draft.status !== 'draft') {
      throw new BadRequestException('Only draft checkouts can be updated');
    }

    this.validateItems(request.items);
    if (request.receiptEmail) {
      this.validateReceiptEmail(request.receiptEmail);
      draft.receiptEmail = request.receiptEmail.trim();
    }
    draft.items = request.items;

    this.drafts.set(draft.id, draft);
    return this.toDraftResponse(draft);
  }

  async initializeCheckout(
    request: CheckoutInitRequestDto,
  ): Promise<CheckoutInitResponseDto> {
    if (request.idempotencyKey) {
      const previous = this.initByIdempotencyKey.get(request.idempotencyKey);
      if (previous) {
        return previous;
      }
    }

    const draft = this.getDraftOrThrow(request.draftId);
    if (draft.items.length === 0) {
      throw new BadRequestException('Checkout draft has no items');
    }

    if (draft.paymentIntentId && draft.amount && draft.currency) {
      const existingIntent = await this.stripeService.getPaymentIntent(
        draft.paymentIntentId,
      );
      const existing: CheckoutInitResponseDto = {
        checkoutId: draft.id,
        paymentIntentId: existingIntent.id,
        clientSecret: existingIntent.client_secret,
        amount: draft.amount,
        currency: draft.currency,
        status: this.mapPaymentToCheckoutStatus(existingIntent.status),
      };
      if (request.idempotencyKey) {
        this.initByIdempotencyKey.set(request.idempotencyKey, existing);
      }
      return existing;
    }

    const prices = await this.stripeService.getPriceList();
    const activePriceMap = new Map<string, Stripe.Price>();
    for (const price of prices) {
      if (price.active) {
        activePriceMap.set(price.id, price);
      }
    }

    let amount = 0;
    let currency: string | undefined;

    for (const item of draft.items) {
      const price = activePriceMap.get(item.priceId);
      if (!price) {
        throw new BadRequestException(
          `Price ${item.priceId} is invalid or inactive`,
        );
      }

      const expectedProductId = StripeService.getNormalizedStripeObjectId(
        price.product,
      );
      if (!expectedProductId || expectedProductId !== item.productId) {
        throw new BadRequestException(
          `Price ${item.priceId} does not match product ${item.productId}`,
        );
      }

      if (!price.unit_amount || price.unit_amount <= 0) {
        throw new BadRequestException(
          `Price ${item.priceId} does not have a billable unit amount`,
        );
      }

      if (!currency) {
        currency = price.currency;
      }
      if (currency !== price.currency) {
        throw new BadRequestException(
          'All line items in a checkout draft must use the same currency',
        );
      }

      amount += price.unit_amount * item.quantity;
    }

    if (!currency || amount <= 0) {
      throw new BadRequestException(
        'Checkout amount must be greater than zero',
      );
    }

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount,
      currency,
      receipt_email: draft.receiptEmail,
      description:
        request.description || `Checkout ${draft.id} payment initialization`,
    });

    const response: CheckoutInitResponseDto = {
      checkoutId: draft.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
      status: this.mapPaymentToCheckoutStatus(paymentIntent.status),
    };

    draft.status = response.status;
    draft.amount = amount;
    draft.currency = currency;
    draft.paymentIntentId = paymentIntent.id;
    this.drafts.set(draft.id, draft);

    if (request.idempotencyKey) {
      this.initByIdempotencyKey.set(request.idempotencyKey, response);
    }

    return response;
  }

  async getCheckoutStatus(draftId: string): Promise<CheckoutStatusResponseDto> {
    const draft = this.getDraftOrThrow(draftId);

    if (!draft.paymentIntentId) {
      return {
        checkoutId: draft.id,
        checkoutStatus: draft.status,
        amount: draft.amount,
        currency: draft.currency,
      };
    }

    const paymentIntent = await this.stripeService.getPaymentIntent(
      draft.paymentIntentId,
    );
    const checkoutStatus = this.mapPaymentToCheckoutStatus(
      paymentIntent.status,
    );

    draft.status = checkoutStatus;
    this.drafts.set(draft.id, draft);

    return {
      checkoutId: draft.id,
      checkoutStatus,
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      amount: draft.amount,
      currency: draft.currency,
    };
  }

  private getDraftOrThrow(draftId: string): StoredCheckoutDraft {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new NotFoundException(`Checkout draft ${draftId} not found`);
    }
    return draft;
  }

  private validateReceiptEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new BadRequestException(
        'receiptEmail must be a valid email address',
      );
    }
  }

  private validateItems(items: CheckoutLineItemDto[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('Checkout items are required');
    }

    for (const item of items) {
      if (!item.productId || !item.priceId) {
        throw new BadRequestException(
          'Each item must include productId and priceId',
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'Item quantity must be a positive integer',
        );
      }
    }
  }

  private toDraftResponse(
    draft: StoredCheckoutDraft,
  ): CheckoutDraftResponseDto {
    return {
      id: draft.id,
      status: draft.status,
      receiptEmail: draft.receiptEmail,
      items: draft.items,
      amount: draft.amount,
      currency: draft.currency,
      paymentIntentId: draft.paymentIntentId,
    };
  }

  private mapPaymentToCheckoutStatus(
    paymentStatus: Stripe.PaymentIntent.Status,
  ): 'ready_to_pay' | 'paid' | 'failed' {
    if (paymentStatus === 'succeeded') {
      return 'paid';
    }
    if (paymentStatus === 'canceled') {
      return 'failed';
    }
    return 'ready_to_pay';
  }
}
