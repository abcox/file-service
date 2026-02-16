import { ApiProperty } from '@nestjs/swagger';
import { Stripe } from 'stripe';
import { StripeLastPaymentErrorDto } from './stripe-last-payment-error.dto';

export class StripePaymentIntentDto {
  @ApiProperty({ description: 'Unique identifier for the payment intent' })
  id: string;

  @ApiProperty({ description: 'Object type, should be "payment_intent"' })
  object: 'payment_intent';

  @ApiProperty({ description: 'Amount intended to be collected' })
  amount: number;

  @ApiProperty({
    description: 'Amount that can be captured from the payment intent',
  })
  amount_capturable: number;

  @ApiProperty({ description: 'Amount that was collected' })
  amount_received: number;

  @ApiProperty({
    description: 'Application associated with the payment intent',
  })
  application: string | Stripe.Application | null;

  @ApiProperty({
    description: 'Application fee amount associated with the payment intent',
  })
  application_fee_amount: number | null;

  @ApiProperty({
    description: 'Automatic payment methods associated with the payment intent',
  })
  automatic_payment_methods: Stripe.PaymentIntent.AutomaticPaymentMethods | null;

  @ApiProperty({
    description: 'Timestamp when the payment intent was canceled',
  })
  canceled_at: number | null;

  @ApiProperty({ description: 'Reason for cancellation of the payment intent' })
  cancellation_reason: Stripe.PaymentIntent.CancellationReason | null;

  @ApiProperty({ description: 'Method of capturing the payment intent' })
  capture_method: Stripe.PaymentIntent.CaptureMethod;

  @ApiProperty({ description: 'Charges associated with the payment intent' })
  charges: Stripe.ApiList<Stripe.Charge>;

  @ApiProperty({
    description: 'Client secret associated with the payment intent',
  })
  client_secret: string | null;

  @ApiProperty({ description: 'Confirmation method of the payment intent' })
  confirmation_method: Stripe.PaymentIntent.ConfirmationMethod;

  @ApiProperty({ description: 'Timestamp when the payment intent was created' })
  created: number;

  @ApiProperty({ description: 'Currency of the payment intent' })
  currency: string;

  @ApiProperty({ description: 'Customer associated with the payment intent' })
  customer: string | Stripe.Customer | null;

  @ApiProperty({
    description: 'Customer account associated with the payment intent',
  })
  customer_account: string | null;

  @ApiProperty({
    description: 'Description of the payment intent',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Details about the payment intent' })
  excluded_payment_method_types:
    | Stripe.PaymentIntent.ExcludedPaymentMethodType[]
    | null;

  @ApiProperty({ description: 'Invoice associated with the payment intent' })
  invoice: string | Stripe.Invoice | null;

  @ApiProperty({ description: 'Last payment error, if any' })
  last_payment_error: StripeLastPaymentErrorDto | null;

  @ApiProperty({ description: 'Next charge scheduled for the payment intent' })
  latest_charge: string | Stripe.Charge | null;

  @ApiProperty({ description: 'Live mode status of the payment intent' })
  livemode: boolean;

  @ApiProperty({ description: 'Metadata associated with the payment intent' })
  metadata: Stripe.Metadata;

  @ApiProperty({ description: 'Next action required for the payment intent' })
  next_action: Stripe.PaymentIntent.NextAction | null;

  @ApiProperty({
    description: 'On behalf of the account associated with the payment intent',
  })
  on_behalf_of: string | Stripe.Account | null;

  @ApiProperty({
    description: 'Payment method associated with the payment intent',
  })
  payment_method: string | Stripe.PaymentMethod | null;

  @ApiProperty({ description: 'Payment method details of the payment intent' })
  payment_method_configuration_details: Stripe.PaymentIntent.PaymentMethodConfigurationDetails | null;

  @ApiProperty({ description: 'Options for the payment method' })
  payment_method_options: Stripe.PaymentIntent.PaymentMethodOptions | null;

  @ApiProperty({
    description: 'Types of payment methods for the payment intent',
  })
  payment_method_types: string[];

  @ApiProperty({ description: 'Processing information of the payment intent' })
  processing: Stripe.PaymentIntent.Processing | null;

  @ApiProperty({
    description: 'Quote associated with the payment intent',
    nullable: true,
  })
  receipt_email: string | null;

  @ApiProperty({ description: 'Review associated with the payment intent' })
  review: string | Stripe.Review | null;

  @ApiProperty({ description: 'Setup future usage of the payment intent' })
  setup_future_usage: Stripe.PaymentIntent.SetupFutureUsage | null;

  @ApiProperty({ description: 'Shipping information for the payment intent' })
  shipping: Stripe.PaymentIntent.Shipping | null;

  @ApiProperty({ description: 'Source associated with the payment intent' })
  source: string | Stripe.CustomerSource | Stripe.DeletedCustomerSource | null;

  @ApiProperty({ description: 'Statement descriptor for the payment intent' })
  statement_descriptor: string | null;

  @ApiProperty({
    description: 'Statement descriptor suffix for the payment intent',
  })
  statement_descriptor_suffix: string | null;

  @ApiProperty({ description: 'Status of the payment intent' })
  status: Stripe.PaymentIntent.Status;

  @ApiProperty({ description: 'Transfer data for the payment intent' })
  transfer_data: Stripe.PaymentIntent.TransferData | null;

  @ApiProperty({ description: 'Transfer group for the payment intent' })
  transfer_group: string | null;

  constructor(partial: Partial<Stripe.PaymentIntent>) {
    Object.assign(this, partial);
  }
}
