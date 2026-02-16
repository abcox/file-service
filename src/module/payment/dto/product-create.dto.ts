import {
  /* ApiHideProperty, */ ApiHideProperty,
  ApiProperty,
} from '@nestjs/swagger';
//import { ProductDto } from './product.dto';
import Stripe from 'stripe';

export class ProductCreateDto /* extends ProductDto  */ {
  /* @ApiHideProperty()
  @ApiProperty({ description: 'Product ID' })
  declare id: string; */

  @ApiProperty({ description: 'Currency code for the price', example: 'usd' })
  currency: 'usd' | 'cad';

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Initial price for the product' })
  price: number;

  @ApiHideProperty()
  private _tax_behavior: string;

  @ApiHideProperty()
  private _price: string;

  constructor(value: {
    description: string;
    name: string;
    price: number;
    currency: 'usd' | 'cad';
  }) {
    //super(value);
    const { currency, description, name, price } = value;
    this.description = description;
    this.name = name;
    this.price = price;
    this._price = price.toString();
    this.currency = currency;
    this._tax_behavior = 'inclusive';
  }

  public toStripeProductCreateParams(): Stripe.ProductCreateParams {
    return {
      description: this.description,
      //metadata: this.metadata,
      name: this.name,
    } as Stripe.ProductCreateParams;
  }

  public toStripePriceCreateParams(
    productId: string,
  ): Stripe.PriceCreateParams {
    let price = {
      currency: this.currency,
      //metadata: this.metadata,
      /* product_data: {
        name: this.name,
        description: this.description,
      }, */
      product: productId,
      tax_behavior: this._tax_behavior,
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
