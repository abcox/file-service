import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean } from 'class-validator';
import { BaseResponseDto } from './base-response.dto';

/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Base search response DTO for collection operations with pagination
 */
export class BaseSearchResponseDto<T = any> extends BaseResponseDto<T[]> {
  @ApiProperty({
    description: 'Total number of items matching the search criteria',
    example: 150,
    type: Number,
  })
  @IsNumber()
  totalCount: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
  })
  @IsNumber()
  pageSize: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number,
  })
  @IsNumber()
  currentPage: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
    type: Number,
  })
  @IsNumber()
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page available',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page available',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  hasPrevious: boolean;
}
