import { ApiProperty } from '@nestjs/swagger';

export class PublicCatalogPriceDto {
  @ApiProperty({ description: 'Stripe price id', example: 'price_123' })
  id!: string;

  @ApiProperty({ description: 'ISO currency code', example: 'cad' })
  currency!: string;

  @ApiProperty({
    description: 'Unit amount in the smallest currency unit',
    example: 15000,
  })
  unitAmount!: number;

  @ApiProperty({
    description: 'Recurring interval if this is a recurring price',
    required: false,
    example: 'month',
  })
  interval?: string;
}

export class PublicCatalogItemDto {
  @ApiProperty({ description: 'Stripe product id', example: 'prod_123' })
  id!: string;

  @ApiProperty({
    description: 'Display name of the service',
    example: 'MVP Build',
  })
  name!: string;

  @ApiProperty({
    description: 'Description of the service',
    required: false,
    example: 'Build and launch a market-ready MVP.',
  })
  description?: string;

  @ApiProperty({
    description: 'Default Stripe price id for the product',
    required: false,
    example: 'price_123',
  })
  defaultPriceId?: string;

  @ApiProperty({
    description: 'Sellable prices available for this product',
    type: [PublicCatalogPriceDto],
  })
  prices!: PublicCatalogPriceDto[];
}

export class PublicCatalogResponseDto {
  @ApiProperty({
    description: 'Active sellable catalog items',
    type: [PublicCatalogItemDto],
  })
  items!: PublicCatalogItemDto[];
}
