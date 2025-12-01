import { ApiProperty } from '@nestjs/swagger';
import { Asset } from '../../db/doc/entity/asset/asset.entity';

export class AssetResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: Asset;

  @ApiProperty({ required: false })
  errors?: string[];
}

export class AssetListItem {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  tags?: string[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  visibility: string;

  @ApiProperty()
  ownedBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  summary?: string;

  @ApiProperty({ default: 0 })
  viewCount: number;

  @ApiProperty({ default: false })
  isTemplate: boolean;

  @ApiProperty({ default: false })
  isFavorite: boolean;

  @ApiProperty({ default: false })
  isArchived: boolean;
}

export class AssetListData {
  @ApiProperty({ type: [AssetListItem] })
  assets: AssetListItem[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class AssetListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: AssetListData;

  @ApiProperty({ required: false })
  errors?: string[];
}
