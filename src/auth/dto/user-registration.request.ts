import { ApiProperty } from '@nestjs/swagger';

export class UserRegistrationRequest {
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

  @ApiProperty({ 
    description: 'User full name', 
    example: 'John Doe' 
  })
  name: string;

  @ApiProperty({ 
    description: 'Username', 
    example: 'johndoe' 
  })
  username: string;
}
