import { ApiProperty } from '@nestjs/swagger';
import { Stripe } from 'stripe';
import { StripeAddressDto } from './stripe-address.dto';

export class StripeShippingInformationDto
  implements Stripe.PaymentIntent.Shipping
{
  @ApiProperty({ description: 'Name of the recipient' })
  name: string;

  @ApiProperty({ description: 'Address of the recipient' })
  address: StripeAddressDto;

  @ApiProperty({
    description: 'Phone number of the recipient',
    required: false,
  })
  phone?: string | undefined;

  @ApiProperty({
    description: 'Tracking number of the shipment',
    required: false,
  })
  tracking_number?: string | undefined;

  @ApiProperty({ description: 'Carrier of the shipment', required: false })
  carrier?: string | undefined;
}
