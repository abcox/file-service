import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, IsArray } from 'class-validator';

/**
 * Base generic response DTO that properly handles type references
 */
export class BaseGenericResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates whether the operation was successful',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Response message describing the operation result',
    example: 'Operation completed successfully',
    type: String,
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Response data payload',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  data?: T;

  @ApiPropertyOptional({
    description: 'Array of error messages if the operation failed',
    example: ['Validation failed', 'Resource not found'],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}

/**
 * Helper function to create typed response DTOs
 */
export function createTypedResponseDto<T>() {
  return class TypedResponseDto extends BaseGenericResponseDto<T> {
    declare data?: T;
  };
}
