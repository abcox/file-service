import { PartialType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

// Entity-reference approach - automatically syncs with Asset entity changes
export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
