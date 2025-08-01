import { Controller, Param, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from '../../service/user/user.service';
import { Auth } from '../../auth/auth.guard';
import { UserEntity } from '../../database/entities/user.entity';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // get user by email
  @Get('email/:email')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Get user by email' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<Partial<UserEntity> | null> {
    return await this.userService.getUserByEmail(email);
  }

  // get all users (admin only)
  @Get('list')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getUserList(): Promise<Partial<UserEntity>[]> {
    return await this.userService.getUserList();
  }

  @Delete('user/:userId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    return await this.userService.deleteUser(userId);
  }
}
