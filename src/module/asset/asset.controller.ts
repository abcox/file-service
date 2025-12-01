import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Query,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Auth } from '../auth/auth.guard';
import { AssetService } from './asset.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetResponseDto,
  AssetListResponseDto,
} from './dto';

@ApiTags('Asset')
@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ description: 'Asset data to create', type: CreateAssetDto })
  @ApiResponse({
    status: 201,
    description: 'Asset created successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or asset already exists',
  })
  async createAsset(
    @Body() assetData: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    try {
      const newAsset = await this.assetService.createAsset(assetData);
      return {
        success: true,
        message: 'Asset created successfully',
        data: newAsset,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset found',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetById(@Param('id') id: string): Promise<AssetResponseDto> {
    try {
      const asset = await this.assetService.getAssetById(id);
      if (!asset) {
        throw new HttpException(
          {
            success: false,
            message: `Asset with ID '${id}' not found`,
            errors: ['Asset not found'],
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: 'Asset found',
        data: asset,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('owner/:ownerId')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Get assets by owner' })
  @ApiParam({ name: 'ownerId', description: 'Owner user ID' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    description: 'Include archived assets',
  })
  @ApiResponse({
    status: 200,
    description: 'Assets found',
  })
  async getAssetsByOwner(
    @Param('ownerId') ownerId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    try {
      const includeArchivedFlag = includeArchived?.toLowerCase() === 'true';
      const assets = await this.assetService.getAssetsByOwner(ownerId, {
        includeArchived: includeArchivedFlag,
      });
      return {
        success: true,
        message: `Found ${assets.length} assets for owner`,
        data: assets,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Update asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ description: 'Asset data to update', type: UpdateAssetDto })
  @ApiResponse({
    status: 200,
    description: 'Asset updated successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async updateAsset(
    @Param('id') id: string,
    @Body() updateData: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    try {
      const updatedAsset = await this.assetService.updateAsset(id, updateData);
      return {
        success: true,
        message: 'Asset updated successfully',
        data: updatedAsset!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Delete(':id')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete asset by ID (hard delete)' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async deleteAsset(@Param('id') id: string) {
    try {
      return await this.assetService.deleteAsset(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Put(':id/archive')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Archive asset by ID (sets isArchived to true)' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset archived successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async archiveAsset(@Param('id') id: string): Promise<AssetResponseDto> {
    try {
      const archivedAsset = await this.assetService.archiveAsset(id);
      return {
        success: true,
        message: 'Asset archived successfully',
        data: archivedAsset!,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        statusCode,
      );
    }
  }

  @Get()
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get list of assets with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by asset status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by asset type',
  })
  @ApiQuery({
    name: 'ownedBy',
    required: false,
    description: 'Filter by owner ID',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    description: 'Filter by visibility',
  })
  @ApiQuery({
    name: 'isTemplate',
    required: false,
    description: 'Filter by template flag',
  })
  @ApiQuery({
    name: 'isArchived',
    required: false,
    description: 'Filter by archived status (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset list retrieved successfully',
    type: AssetListResponseDto,
  })
  async getAssetList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('ownedBy') ownedBy?: string,
    @Query('visibility') visibility?: string,
    @Query('isTemplate') isTemplate?: string,
    @Query('isArchived') isArchived?: string,
  ): Promise<AssetListResponseDto> {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const isTemplateFlag = isTemplate
        ? isTemplate.toLowerCase() === 'true'
        : undefined;
      const isArchivedFlag = isArchived
        ? isArchived.toLowerCase() === 'true'
        : false;

      const result = await this.assetService.getAssetList({
        page: pageNum,
        limit: limitNum,
        status,
        type,
        ownedBy,
        visibility,
        isTemplate: isTemplateFlag,
        isArchived: isArchivedFlag,
      });

      return {
        success: true,
        message: `Found ${result.assets.length} assets (${result.total} total)`,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search/:searchTerm')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Search assets by title, content, or keywords' })
  @ApiParam({ name: 'searchTerm', description: 'Search term to find assets' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by asset type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by asset status',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchAssets(
    @Param('searchTerm') searchTerm: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const result = await this.assetService.searchAssets({
        searchTerm,
        page: pageNum,
        limit: limitNum,
        type,
        status,
      });

      return {
        success: true,
        message: `Found ${result.assets.length} assets matching search (${result.total} total)`,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('type/:type')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Get assets by type' })
  @ApiParam({ name: 'type', description: 'Asset type' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results (default: 50)',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    description: 'Include archived assets',
  })
  @ApiResponse({
    status: 200,
    description: 'Assets found by type',
  })
  async getAssetsByType(
    @Param('type') type: string,
    @Query('limit') limit?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const includeArchivedFlag = includeArchived?.toLowerCase() === 'true';

      const assets = await this.assetService.getAssetsByType(type, {
        limit: limitNum,
        includeArchived: includeArchivedFlag,
      });

      return {
        success: true,
        message: `Found ${assets.length} assets of type '${type}'`,
        data: assets,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('related/:entityType/:entityId')
  @Auth({ roles: ['admin', 'user', 'guest'] })
  @ApiOperation({ summary: 'Get assets related to a specific entity' })
  @ApiParam({
    name: 'entityType',
    description: 'Entity type (contact, user, project, organization)',
  })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({
    status: 200,
    description: 'Related assets found',
  })
  async getRelatedAssets(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    try {
      const assets = await this.assetService.getRelatedAssets(
        entityType,
        entityId,
      );

      return {
        success: true,
        message: `Found ${assets.length} assets related to ${entityType}:${entityId}`,
        data: assets,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
          errors: [errorMessage],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
