import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  RegistrationService,
  UserRegistrationRequest,
  UserRegistrationResponse,
} from '../../service/user/user.service';

@ApiTags('users')
@Controller('user')
export class UserController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserRegistrationRequest })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(
    @Body() registrationRequest: UserRegistrationRequest,
  ): Promise<UserRegistrationResponse> {
    return this.registrationService.register(registrationRequest);
  }
}
