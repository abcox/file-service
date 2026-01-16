import { ApiProperty } from '@nestjs/swagger';

export class UserBaseDto {
  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Whether user account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether user has admin privileges',
    example: false,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: 'User roles',
    example: ['user'],
    type: [String],
  })
  roles: string[];
}
