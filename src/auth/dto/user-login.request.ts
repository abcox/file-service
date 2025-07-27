import { ApiProperty } from '@nestjs/swagger';

export class UserLoginRequest {
  @ApiProperty({ 
    description: 'User email address', 
    example: 'user@example.com' 
  })
  email: string;

  @ApiProperty({ 
    description: 'User password', 
    example: 'securePassword123' 
  })
  password: string;
}
