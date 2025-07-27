import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class UserLoginResponse {
  @ApiProperty({ 
    description: 'Operation success status', 
    example: true 
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Response message', 
    example: 'User logged in successfully' 
  })
  message: string;

  @ApiProperty({ 
    description: 'JWT authentication token', 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
  })
  token: string;

  @ApiProperty({ 
    description: 'User information (null if login failed)', 
    type: UserDto,
    nullable: true 
  })
  user: UserDto | null;
}
