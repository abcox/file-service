import { /* ApiHideProperty, */ ApiProperty } from '@nestjs/swagger';

export class PaymentIntentCreateRequestDto {
  @ApiProperty({
    description: 'Amount to be charged in smallest currency unit',
    example: 500,
  })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'cad' })
  currency: string;

  /* @ApiProperty({
    description: 'List of payment method types',
    example: ['card'],
  })
  payment_method_types: string[]; */

  @ApiProperty({
    description: 'Email address for receipt',
    example: 'adam@adamcox.net',
  })
  receipt_email: string;

  /* @ApiProperty({
    description: 'URL to redirect after payment',
    example: 'https://vorba.com/payment',
    required: false,
  })
  return_url?: string; */

  @ApiProperty({
    description: 'Description for the payment intent',
    example: 'Payment for order #1234',
    required: false,
  })
  description?: string;

  /* @ApiHideProperty()
  customerId?: string; */
}
