import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Delete,
  Res,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/api-key.guard';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@ApiTags('files')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    console.log('Health check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vorba-file-service',
      version: process.env.npm_package_version || '1.0.0',
      port: process.env.PORT || 'not set',
      environment: process.env.NODE_ENV || 'not set',
    };
  }

  // TODO: review these decortors because we are effectively guarding all since auth module is loaded
  // SEE api-key.guard.ts for public paths
  @Get() /* 
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() */
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns hello message' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  getHello(): string {
    console.log('Root endpoint requested');
    return this.appService.getHello();
  }

  @Get('debug-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug JWT configuration' })
  @ApiResponse({ status: 200, description: 'JWT debug info' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  debugJwt() {
    return { message: 'JWT debug endpoint - check logs for details' };
  }

  @Post('upload')
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
  uploadFile(@UploadedFile() file: UploadedFile) {
    return this.appService.uploadFile(file);
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all files' })
  @ApiResponse({ status: 200, description: 'Returns list of files' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  getFiles() {
    return this.appService.getFiles();
  }

  @Get('files/:filename')
  @ApiOperation({ summary: 'Download a file by filename (test)' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  @ApiQuery({
    name: 'downloadAs',
    required: false,
    description: 'Optional new filename for the download',
  })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Query('downloadAs') downloadAs?: string,
  ) {
    return this.appService.downloadFile(filename, res, downloadAs);
  }

  @Delete('files/:filename')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'filename', description: 'Name of the file to delete' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@Param('filename') filename: string) {
    return this.appService.deleteFile(filename);
  }
}
