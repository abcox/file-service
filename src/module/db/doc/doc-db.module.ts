import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/module/config/config.service';
import { ConfigModule } from 'src/module/config/config.module';
import { QuizSchema } from './schema/quiz/quiz.schema';
import { ContactSchema } from './schema/contact/contact.schema';
import { AssetSchema } from './schema/asset/asset.schema';
import { MetadataSchema } from './schema/metadata/metadata.schema';
import {
  QUIZ_COLLECTION,
  ASSET_COLLECTION,
  CONTACT_COLLECTION,
  METADATA_COLLECTION,
  QUIZ_MODEL,
  CONTACT_MODEL,
  ASSET_MODEL,
  METADATA_MODEL,
} from './doc-db.constants';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        uri: configService.getConfig().azure.cosmosDb?.connectionString || '',
        dbName: configService.getConfig().azure.cosmosDb?.database || '',
      }),
    }),
    MongooseModule.forFeature([
      // Quiz collection (existing)
      {
        name: QUIZ_MODEL,
        schema: QuizSchema,
        collection: QUIZ_COLLECTION,
      },
      // Contact management collections
      {
        name: CONTACT_MODEL,
        schema: ContactSchema,
        collection: CONTACT_COLLECTION,
      },
      {
        name: ASSET_MODEL,
        schema: AssetSchema,
        collection: ASSET_COLLECTION,
      },
      {
        name: METADATA_MODEL,
        schema: MetadataSchema,
        collection: METADATA_COLLECTION,
      },
    ]),
  ],
  providers: [],
  exports: [MongooseModule],
})
export class DocDbModule {}
