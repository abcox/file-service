import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';

const toBoolean = ({ value }: TransformFnParams): boolean | undefined => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};

export class UserSearchRequest {
  @ApiProperty({
    example: 'john.doe',
    required: false,
  })
  username?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    example: true,
    required: false,
  })
  @Transform(toBoolean)
  isActive?: boolean;

  /* @ApiProperty({
    example: '[admin, user]',
    required: false,
  })
  roles?: string[]; */
  @ApiProperty({
    example: true,
    required: false,
  })
  @Transform(toBoolean)
  isAdmin?: boolean;

  @ApiProperty({
    example: '[createdAt, username]',
    required: false,
  })
  sortBy?: string[];
}
