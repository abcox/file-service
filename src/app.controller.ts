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
} from '@nestjs/swagger';
import { Response } from 'express';
import { AppService } from './app.service';

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

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns hello message' })
  getHello(): string {
    return this.appService.getHello();
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
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: UploadedFile) {
    return this.appService.uploadFile(file);
  }

  @Get('files')
  @ApiOperation({ summary: 'Get all files' })
  @ApiResponse({ status: 200, description: 'Returns list of files' })
  getFiles() {
    return this.appService.getFiles();
  }

  @Get('files/:filename')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  @ApiQuery({
    name: 'downloadAs',
    required: false,
    description: 'Optional new filename for the download',
  })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
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
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@Param('filename') filename: string) {
    return this.appService.deleteFile(filename);
  }
}
