import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import Stripe from 'stripe';

export class ProductDto {
  private metadata: Stripe.MetadataParam;
  private tax_behavior: 'inclusive';
  private _price: string;

  @ApiProperty({ description: 'Currency code', example: 'usd' })
  currency: 'usd' | 'cad';

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiHideProperty()
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Price' })
  price: number;

  constructor(value: {
    description: string;
    id: string;
    name: string;
    price: number;
  }) {
    const { description, name, price } = value;
    this.description = description;
    this.name = name;
    this.price = price;
    this._price = price.toString();
    this.currency = 'usd';
    this.metadata = {};
    this.tax_behavior = 'inclusive';
    this.id = value.id;
  }

  public toStripeProductCreateParams(): Stripe.ProductCreateParams {
    return {
      description: this.description,
      metadata: this.metadata,
      name: this.name,
    } as Stripe.ProductCreateParams;
  }

  public toStripePriceCreateParams(
    productId?: string,
  ): Stripe.PriceCreateParams {
    productId = productId || this.id;
    if (!productId) {
      throw new Error('Product ID is required to create price params');
    }
    let price = {
      currency: this.currency,
      metadata: this.metadata,
      /* product_data: {
        name: this.name,
        description: this.description,
      }, */
      product: productId,
      tax_behavior: this.tax_behavior,
      unit_amount: this.price,
    } as Stripe.PriceCreateParams;

    if (!Number.isInteger(this.price)) {
      delete price.unit_amount;
      price = {
        ...price,
        unit_amount_decimal: this._price,
      } as Stripe.PriceCreateParams;
    }

    return price;
  }
}
