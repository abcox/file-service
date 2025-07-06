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
  //ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
  //ApiBearerAuth, // use Auth decorator
  //ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from '../../auth/auth.guard';
import { FileService } from '../../service/file/file.service';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  // TODO: add search endpoint with pagination

  @Get('list')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Get list of files' })
  @ApiResponse({ status: 200, description: 'Returns list of files' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  getFiles() {
    return this.fileService.getFiles();
  }

  @Get('download/:filename')
  //@Auth({ claims: { permission: 'read' } })
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Download a file by filename' })
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
    return this.fileService.downloadFile(filename, res, downloadAs);
  }

  @Post('upload')
  @Auth({ audience: 'file-service' })
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
    return this.fileService.uploadFile(file);
  }

  @Delete('delete/:filename')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'filename', description: 'Name of the file to delete' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@Param('filename') filename: string) {
    return this.fileService.deleteFile(filename);
  }
}
