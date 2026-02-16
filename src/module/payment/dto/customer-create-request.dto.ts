import { ApiProperty } from '@nestjs/swagger';
import Stripe from 'stripe';

export class CustomerCreateRequestDto
  implements Partial<Stripe.CustomerCreateParams>
{
  @ApiProperty({
    description: 'Customer email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: 'Customer name', example: 'John Doe' })
  name?: string;

  @ApiProperty({ description: 'Customer phone number', example: '+1234567890' })
  phone?: string;

  /* @ApiProperty({ description: 'Customer metadata', example: {} })
  metadata?: Stripe.MetadataParam; */
}
