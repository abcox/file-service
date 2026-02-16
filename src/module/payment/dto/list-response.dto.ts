import { ApiProperty } from '@nestjs/swagger';

export class ListResponse<T> {
  @ApiProperty({ description: 'List of items' })
  list: T[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;
}
