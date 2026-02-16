import { ApiProperty } from '@nestjs/swagger';
import Stripe from 'stripe';

export class ProductDetailDto {
  @ApiProperty({ description: 'Product details' })
  product: Stripe.Product | undefined;

  @ApiProperty({ description: 'List of prices for the product' })
  priceList?: Stripe.Price[];
}
