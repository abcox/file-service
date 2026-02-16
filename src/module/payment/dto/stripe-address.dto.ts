import { Stripe } from 'stripe';

export class StripeAddressDto implements Stripe.Address {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postal_code: string | null;
  state: string | null;
}
