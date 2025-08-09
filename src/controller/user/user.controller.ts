import {
  Controller,
  Param,
  Get,
  Delete,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import {
  UserFileUploadResponse,
  UserService,
} from '../../service/user/user.service';
import { Auth } from '../../auth/auth.guard';
import { UserEntity } from '../../database/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../../auth/auth.service';
import { UpdateUserDto } from '../../shared/model/user/update-user.dto';
import { UserUpdateResponse } from '../../service/user/user.service';
import { CreateUserDto } from '../../shared/model/user/create-user.dto';
import { UserDto } from '../../auth/dto/user.dto';
import { UserQuizResultService } from '../../module/user-quiz-result/user-quiz-result.service';
import { SubmitQuizActionDto } from './user-quiz-action.dto';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userQuizResultService: UserQuizResultService,
  ) {}

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

  // get user by ID
  @Get(':userId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getUserById(
    @Param('userId') userId: string,
  ): Promise<Partial<UserEntity> | null> {
    return await this.userService.getUserById(userId);
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

  @Put(':userId/activate')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Activate user (admin only)' })
  @ApiResponse({ status: 200, description: 'User activated' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async activateUser(
    @Param('userId') userId: string,
  ): Promise<UserUpdateResponse> {
    return await this.userService.activateUser(userId);
  }

  @Put(':userId/deactivate')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Deactivate user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async deactivateUser(
    @Param('userId') userId: string,
  ): Promise<UserUpdateResponse> {
    return await this.userService.deactivateUser(userId);
  }

  @Post('create')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Create user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return await this.userService.createUser(createUserDto);
  }

  @Put(':userId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({
    type: UserUpdateResponse,
    status: 200,
    description: 'User updated',
  })
  @ApiResponse({
    type: UserUpdateResponse,
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserUpdateResponse> {
    return await this.userService.updateUser(userId, updateUserDto);
  }

  //#region File Upload
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
  //#endregion File Upload

  //#region User Quiz Result

  @ApiTags('User Quiz Results')
  @Post('quiz/action/submit')
  @Auth({ roles: ['admin', 'user', 'guest'] }) // Require at least guest authentication
  @ApiOperation({ summary: 'Submit a quiz action' })
  @ApiBody({
    type: SubmitQuizActionDto,
    description: 'Quiz action data to submit',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz action submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async submitQuizAction(
    @Body()
    quizActionDataIn: Partial<Omit<SubmitQuizActionDto, 'userId'>>,
    @Req() request: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as User;
    const quizActionData = {
      ...quizActionDataIn,
      userId: user.id,
    };

    const result =
      await this.userQuizResultService.submitQuizAction(quizActionData);
    return {
      success: true,
      message: 'Quiz action submitted successfully',
      result,
    };
  }

  @ApiTags('User Quiz Results')
  @Get(':userId/quiz/result')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get all quiz results for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to fetch results for' })
  @ApiResponse({
    status: 200,
    description: 'Quiz results retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserQuizResults(@Param('userId') userId: string) {
    const results = await this.userQuizResultService.getUserQuizResults(userId);
    return {
      success: true,
      message: `Found ${results.length} quiz results`,
      results,
    };
  }
  //#endregion User Quiz Result
}
