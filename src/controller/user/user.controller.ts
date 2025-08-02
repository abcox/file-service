import {
  Controller,
  Param,
  Get,
  Delete,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  UserFileUploadResponse,
  UserService,
} from '../../service/user/user.service';
import { Auth } from '../../auth/auth.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../../auth/auth.service';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

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

  @Delete(':userId')
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

  @Post('file/upload')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: UploadedFile,
    @Req() request: any,
  ): Promise<UserFileUploadResponse> {
    const { buffer: fileBuffer, originalname: filename } = file;
    if (!fileBuffer || !filename) {
      throw new Error('File buffer or originalname is missing');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as User;
    return this.userService.uploadFile(user, filename, fileBuffer);
  }
}
