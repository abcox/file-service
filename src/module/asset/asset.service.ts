import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError, FilterQuery } from 'mongoose';
import { Asset, AssetRelationship } from '../db/doc/entity/asset/asset.entity';
import { ASSET_MODEL } from '../db/doc/doc-db.constants';
import { ContactService } from '../contact/contact.service';

export interface GetAssetListRequest {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  ownedBy?: string;
  visibility?: string;
  isTemplate?: boolean;
  isArchived?: boolean;
}

export interface IListResponse<T> {
  data: Array<T>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetListItem {
  _id: string;
  title: string;
  type: string;
  category?: string;
  tags?: string[];
  status: string;
  visibility: string;
  ownedBy: string;
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  viewCount: number;
  isTemplate: boolean;
  isFavorite: boolean;
  isArchived: boolean;
}

export interface GetAssetListResponse extends IListResponse<AssetListItem> {
  assets: AssetListItem[];
}

export interface SearchAssetsRequest {
  searchTerm: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

export interface SearchAssetsResponse extends IListResponse<Asset> {
  assets: Asset[];
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectModel(ASSET_MODEL)
    private readonly assetModel: Model<Asset>,
    private readonly contactService: ContactService,
  ) {}

  private async validateRelatedEntities(
    relatedTo?: AssetRelationship[],
  ): Promise<void> {
    if (!relatedTo?.length) return;

    this.logger.log(`Validating ${relatedTo.length} related entities`);

    for (const relationship of relatedTo) {
      switch (relationship.entityType) {
        case 'contact':
          await this.validateContactRelationship(relationship.entityId);
          break;
        case 'user':
          // TODO: Implement user validation when UserService is available
          this.logger.warn(
            `User validation not implemented for entityId: ${relationship.entityId}`,
          );
          break;
        case 'project':
          // TODO: Implement project validation when ProjectService is available
          this.logger.warn(
            `Project validation not implemented for entityId: ${relationship.entityId}`,
          );
          break;
        case 'organization':
          // TODO: Implement organization validation when OrganizationService is available
          this.logger.warn(
            `Organization validation not implemented for entityId: ${relationship.entityId}`,
          );
          break;
        default: {
          // This should never happen if types are correct
          const entityType = (relationship as { entityType: string })
            .entityType;
          throw new Error(`Unsupported entity type: ${entityType}`);
        }
      }
    }
  }

  private async validateContactRelationship(contactId: string): Promise<void> {
    try {
      this.logger.log(`Validating contact relationship for ID: ${contactId}`);

      const contact = await this.contactService.getContactById(contactId);

      if (!contact) {
        throw new Error(`Contact with ID '${contactId}' not found`);
      }

      // Check contact is active and allows asset associations
      if (!contact.isActive) {
        throw new Error(
          `Contact '${contactId}' is inactive and cannot be associated with assets`,
        );
      }

      // Check contact is not archived
      if (contact.status === 'archived') {
        throw new Error(
          `Cannot associate assets with archived contact '${contactId}'`,
        );
      }

      // Check contact is not deleted
      if (contact.status === 'deleted') {
        throw new Error(
          `Cannot associate assets with deleted contact '${contactId}'`,
        );
      }

      this.logger.log(
        `Contact '${contactId}' validated successfully for asset association`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to validate contact relationship: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async createAsset(
    assetData: Omit<
      Asset,
      | '_id'
      | 'createdAt'
      | 'updatedAt'
      | 'version'
      | 'previousVersions'
      | 'viewCount'
      | 'lastViewedAt'
      | 'downloadCount'
    >,
  ): Promise<Asset> {
    try {
      this.logger.log(`Creating new asset with title: ${assetData.title}`);

      // Validation: ensure either content or fileRef, not both
      const hasContent = Boolean(assetData.content?.trim());
      const hasFileRef = Boolean(assetData.fileRef);

      if (!hasContent && !hasFileRef) {
        throw new Error('Asset must have either content or fileRef');
      }

      if (hasContent && hasFileRef) {
        throw new Error('Asset cannot have both content and fileRef');
      }

      // Check if asset with same title already exists for owner
      const existingAsset = await this.assetModel.findOne({
        title: assetData.title,
        ownedBy: assetData.ownedBy,
        isArchived: { $ne: true },
      });

      if (existingAsset) {
        throw new Error(
          `Asset with title '${assetData.title}' already exists for this owner`,
        );
      }

      // Validate related entities exist and are available for association
      await this.validateRelatedEntities(assetData.relatedTo);

      const newAsset = new this.assetModel({
        ...assetData,
        version: 1,
        viewCount: 0,
        downloadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedAsset = await newAsset.save();
      this.logger.log(`Asset created successfully with ID: ${savedAsset._id}`);
      return savedAsset;
    } catch (error) {
      this.logger.error(
        `Failed to create asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAssetById(id: string): Promise<Asset | null> {
    try {
      this.logger.log(`Fetching asset by ID: ${id}`);
      const asset = await this.assetModel.findById(id);

      if (asset) {
        // Update view count and last viewed timestamp
        await this.assetModel.updateOne(
          { _id: id },
          {
            $inc: { viewCount: 1 },
            $set: { lastViewedAt: new Date() },
          },
        );
      }

      return asset;
    } catch (error) {
      this.logger.error(
        `Failed to fetch asset by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAssetsByOwner(
    ownerId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<Asset[]> {
    try {
      this.logger.log(`Fetching assets for owner: ${ownerId}`);
      const query: FilterQuery<Asset> = { ownedBy: ownerId };

      if (!options.includeArchived) {
        query.isArchived = { $ne: true };
      }

      return await this.assetModel.find(query).sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error(
        `Failed to fetch assets by owner: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async updateAsset(
    id: string,
    updateData: Partial<
      Omit<Asset, '_id' | 'createdAt' | 'updatedAt' | 'ownedBy' | 'createdBy'>
    >,
  ): Promise<Asset | null> {
    try {
      this.logger.log(`Updating asset with ID: ${id}`);

      // Validation if content or fileRef are being updated
      if (
        updateData.content !== undefined ||
        updateData.fileRef !== undefined
      ) {
        const hasContent = Boolean(updateData.content?.trim());
        const hasFileRef = Boolean(updateData.fileRef);

        if (!hasContent && !hasFileRef) {
          throw new Error('Asset must have either content or fileRef');
        }

        if (hasContent && hasFileRef) {
          throw new Error('Asset cannot have both content and fileRef');
        }
      }

      // Validate related entities if they're being updated
      if (updateData.relatedTo !== undefined) {
        await this.validateRelatedEntities(updateData.relatedTo);
      }

      const updatedAsset = await this.assetModel.findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true },
      );

      if (!updatedAsset) {
        throw new Error(`Asset with ID '${id}' not found`);
      }

      this.logger.log(`Asset updated successfully: ${id}`);
      return updatedAsset;
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        const validationMessages = Object.values(error.errors).map(
          (err) => err.message,
        );
        throw new Error(`Validation failed: ${validationMessages.join(', ')}`);
      }
      this.logger.error(
        `Failed to update asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteAsset(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Deleting asset with ID: ${id}`);
      const deletedAsset = await this.assetModel.findByIdAndDelete(id);

      if (!deletedAsset) {
        throw new Error(`Asset with ID '${id}' not found`);
      }

      this.logger.log(`Asset deleted successfully: ${id}`);
      return {
        success: true,
        message: 'Asset deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async archiveAsset(id: string): Promise<Asset | null> {
    try {
      this.logger.log(`Archiving asset with ID: ${id}`);
      return await this.updateAsset(id, {
        isArchived: true,
        status: 'archived',
      });
    } catch (error) {
      this.logger.error(
        `Failed to archive asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAssetList(
    request: GetAssetListRequest,
  ): Promise<GetAssetListResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        ownedBy,
        visibility,
        isTemplate,
        isArchived,
      } = request;
      const skip = (page - 1) * limit;

      this.logger.log(`Fetching asset list - Page: ${page}, Limit: ${limit}`);

      // Build query
      const query: FilterQuery<Asset> = {};
      if (status) query.status = status;
      if (type) query.type = type;
      if (ownedBy) query.ownedBy = ownedBy;
      if (visibility) query.visibility = visibility;
      if (isTemplate !== undefined) query.isTemplate = isTemplate;
      if (isArchived !== undefined) query.isArchived = isArchived;

      // Execute queries
      const [assets, total] = await Promise.all([
        this.assetModel
          .find(query)
          .select(
            '_id title type category tags status visibility ownedBy createdAt updatedAt summary viewCount isTemplate isFavorite isArchived',
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        this.assetModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Found ${assets.length} assets (${total} total)`);

      return {
        assets: assets.map((asset) => ({
          _id: asset._id.toString(),
          title: asset.title,
          type: asset.type,
          category: asset.category,
          tags: asset.tags,
          status: asset.status,
          visibility: asset.visibility,
          ownedBy: asset.ownedBy,
          createdAt: asset.createdAt || new Date(),
          updatedAt: asset.updatedAt || new Date(),
          summary: asset.summary,
          viewCount: asset.viewCount || 0,
          isTemplate: asset.isTemplate || false,
          isFavorite: asset.isFavorite || false,
          isArchived: asset.isArchived || false,
        })),
        data: assets.map((asset) => ({
          _id: asset._id.toString(),
          title: asset.title,
          type: asset.type,
          category: asset.category,
          tags: asset.tags,
          status: asset.status,
          visibility: asset.visibility,
          ownedBy: asset.ownedBy,
          createdAt: asset.createdAt || new Date(),
          updatedAt: asset.updatedAt || new Date(),
          summary: asset.summary,
          viewCount: asset.viewCount || 0,
          isTemplate: asset.isTemplate || false,
          isFavorite: asset.isFavorite || false,
          isArchived: asset.isArchived || false,
        })),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch asset list: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async searchAssets(
    request: SearchAssetsRequest,
  ): Promise<SearchAssetsResponse> {
    try {
      const { searchTerm, page = 1, limit = 10, type, status } = request;
      const skip = (page - 1) * limit;

      this.logger.log(`Searching assets with term: "${searchTerm}"`);

      // Build search query using text index
      const searchQuery: FilterQuery<Asset> = {
        $text: { $search: searchTerm },
      };

      // Additional filters
      if (type) searchQuery.type = type;
      if (status) searchQuery.status = status;

      // Exclude archived unless explicitly searching for them
      if (!searchTerm.includes('archived')) {
        searchQuery.isArchived = { $ne: true };
      }

      // Execute search
      const [assets, total] = await Promise.all([
        this.assetModel
          .find(searchQuery, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        this.assetModel.countDocuments(searchQuery),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Found ${assets.length} assets matching search (${total} total)`,
      );

      return {
        assets,
        data: assets,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getAssetsByType(
    type: string,
    options: { limit?: number; includeArchived?: boolean } = {},
  ): Promise<Asset[]> {
    try {
      const { limit = 50, includeArchived = false } = options;
      this.logger.log(`Fetching assets by type: ${type}`);

      const query: FilterQuery<Asset> = { type };
      if (!includeArchived) {
        query.isArchived = { $ne: true };
      }

      return await this.assetModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      this.logger.error(
        `Failed to fetch assets by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getRelatedAssets(
    entityType: string,
    entityId: string,
  ): Promise<Asset[]> {
    try {
      this.logger.log(`Fetching assets related to ${entityType}:${entityId}`);

      return await this.assetModel
        .find({
          'relatedTo.entityType': entityType,
          'relatedTo.entityId': entityId,
          isArchived: { $ne: true },
        })
        .sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error(
        `Failed to fetch related assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
