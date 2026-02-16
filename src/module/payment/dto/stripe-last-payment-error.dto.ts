import { Stripe } from 'stripe';

export class StripeLastPaymentErrorDto
  implements Stripe.PaymentIntent.LastPaymentError
{
  type: Stripe.PaymentIntent.LastPaymentError['type'];
  message: string;
  code?: Stripe.PaymentIntent.LastPaymentError['code'] | undefined;
  param?: string | undefined;
  decline_code?: string | undefined;
  charge?: Stripe.PaymentIntent.LastPaymentError['charge'] | undefined;
  payment_intent?:
    | Stripe.PaymentIntent.LastPaymentError['payment_intent']
    | Stripe.PaymentIntent
    | undefined;
  payment_method?:
    | Stripe.PaymentIntent.LastPaymentError['payment_method']
    | Stripe.PaymentMethod
    | undefined;
  setup_intent?:
    | Stripe.PaymentIntent.LastPaymentError['setup_intent']
    | Stripe.SetupIntent
    | undefined;
  source?:
    | Stripe.PaymentIntent.LastPaymentError['source']
    | Stripe.Source
    | undefined;
  stripeErrorType?: string | undefined;
  doc_url?: string | undefined;
  request_id?: string | undefined;
}
