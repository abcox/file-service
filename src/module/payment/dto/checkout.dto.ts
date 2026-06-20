import { ApiProperty } from '@nestjs/swagger';

export class CheckoutLineItemDto {
  @ApiProperty({ description: 'Stripe product id', example: 'prod_123' })
  productId!: string;

  @ApiProperty({ description: 'Stripe price id', example: 'price_123' })
  priceId!: string;

  @ApiProperty({ description: 'Quantity selected by the user', example: 1 })
  quantity!: number;
}

export class CheckoutDraftCreateRequestDto {
  @ApiProperty({
    description: 'Receipt email used at checkout',
    example: 'customer@example.com',
  })
  receiptEmail!: string;

  @ApiProperty({
    description: 'Line items for draft checkout',
    type: [CheckoutLineItemDto],
  })
  items!: CheckoutLineItemDto[];
}

export class CheckoutDraftUpdateRequestDto {
  @ApiProperty({
    description: 'Updated line items for draft checkout',
    type: [CheckoutLineItemDto],
  })
  items!: CheckoutLineItemDto[];

  @ApiProperty({
    description: 'Optional updated receipt email',
    required: false,
    example: 'customer@example.com',
  })
  receiptEmail?: string;
}

export class CheckoutDraftResponseDto {
  @ApiProperty({ description: 'Checkout draft id', example: 'chk_abc123' })
  id!: string;

  @ApiProperty({
    description: 'Current checkout state',
    example: 'draft',
    enum: ['draft', 'ready_to_pay', 'paid', 'failed'],
  })
  status!: 'draft' | 'ready_to_pay' | 'paid' | 'failed';

  @ApiProperty({
    description: 'Receipt email associated with checkout',
    example: 'customer@example.com',
  })
  receiptEmail!: string;

  @ApiProperty({ description: 'Draft line items', type: [CheckoutLineItemDto] })
  items!: CheckoutLineItemDto[];

  @ApiProperty({
    description: 'Total in smallest currency unit if initialized',
    required: false,
    example: 15000,
  })
  amount?: number;

  @ApiProperty({
    description: 'ISO currency if initialized',
    required: false,
    example: 'cad',
  })
  currency?: string;

  @ApiProperty({
    description: 'Stripe payment intent id after init',
    required: false,
    example: 'pi_123',
  })
  paymentIntentId?: string;
}

export class CheckoutInitRequestDto {
  @ApiProperty({ description: 'Checkout draft id', example: 'chk_abc123' })
  draftId!: string;

  @ApiProperty({
    description: 'Idempotency key for safe retries',
    required: false,
    example: 'fit-assess-abc123-submit-1',
  })
  idempotencyKey?: string;

  @ApiProperty({
    description: 'Optional user-friendly description for payment intent',
    required: false,
    example: 'Fit assessment checkout',
  })
  description?: string;
}

export class CheckoutInitResponseDto {
  @ApiProperty({ description: 'Checkout draft id', example: 'chk_abc123' })
  checkoutId!: string;

  @ApiProperty({ description: 'Stripe payment intent id', example: 'pi_123' })
  paymentIntentId!: string;

  @ApiProperty({
    description: 'Stripe payment intent client secret',
    example: 'pi_123_secret_abc',
  })
  clientSecret!: string | null;

  @ApiProperty({
    description: 'Committed amount in smallest currency unit',
    example: 15000,
  })
  amount!: number;

  @ApiProperty({ description: 'ISO currency code', example: 'cad' })
  currency!: string;

  @ApiProperty({
    description: 'Checkout state after init',
    example: 'ready_to_pay',
    enum: ['ready_to_pay', 'paid', 'failed'],
  })
  status!: 'ready_to_pay' | 'paid' | 'failed';
}

export class CheckoutStatusResponseDto {
  @ApiProperty({ description: 'Checkout id', example: 'chk_abc123' })
  checkoutId!: string;

  @ApiProperty({
    description: 'Checkout state',
    example: 'ready_to_pay',
    enum: ['draft', 'ready_to_pay', 'paid', 'failed'],
  })
  checkoutStatus!: 'draft' | 'ready_to_pay' | 'paid' | 'failed';

  @ApiProperty({
    description: 'Stripe payment intent id when available',
    required: false,
    example: 'pi_123',
  })
  paymentIntentId?: string;

  @ApiProperty({
    description: 'Stripe payment intent status when available',
    required: false,
    example: 'requires_payment_method',
  })
  paymentStatus?: string;

  @ApiProperty({
    description: 'Committed amount in smallest currency unit if initialized',
    required: false,
    example: 15000,
  })
  amount?: number;

  @ApiProperty({
    description: 'ISO currency if initialized',
    required: false,
    example: 'cad',
  })
  currency?: string;
}
