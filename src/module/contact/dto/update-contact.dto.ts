import { PartialType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';

/**
 * UpdateContactDto extends PartialType of CreateContactDto
 * This ensures that all fields from CreateContactDto are available as optional fields
 * and automatically maintains congruence with the entity definition
 */
export class UpdateContactDto extends PartialType(CreateContactDto) {}
