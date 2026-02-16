import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodListRequestDto {
  @ApiProperty({ description: 'Customer ID', required: false })
  customerId?: string;

  @ApiProperty({ description: 'Payment method type', required: false })
  type?: string;
}
