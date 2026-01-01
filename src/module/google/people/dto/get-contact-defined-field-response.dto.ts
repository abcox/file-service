import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetContactDefinedFieldResponse {
  @ApiProperty({ description: 'The original stored value (as string)' })
  field: Record<string, string> | null;

  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  // when field key ends with 'date', these additional properties are populated

  @ApiPropertyOptional({ description: 'The UTC ISO string representation' })
  utcDate?: string | null;

  @ApiPropertyOptional({
    description: 'The value formatted in the requested time zone, if provided',
  })
  localDate?: string | null;

  @ApiPropertyOptional({
    description: 'The time zone used for localDate formatting',
  })
  timeZone?: string;
}
