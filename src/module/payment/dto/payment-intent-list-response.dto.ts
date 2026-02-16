import { ApiProperty } from '@nestjs/swagger';
import { StripePaymentIntentDto } from './stripe-payment-intent.dto';

export class PaymentIntentListResponseDto {
  @ApiProperty({
    description: 'List of payment intents',
    type: () => StripePaymentIntentDto,
    isArray: true,
  })
  list: StripePaymentIntentDto[];

  @ApiProperty({ description: 'Total number of payment intents' })
  total: number;
}
