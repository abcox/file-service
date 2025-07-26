import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/service/config/config.service';
import { ConfigModule } from 'src/service/config/config.module';
import { QuizSchema } from './schema/quiz/quiz.schema';
import { QUIZ_COLLECTION } from './doc-db.constants';

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
      {
        name: 'Quiz',
        schema: QuizSchema,
        collection: QUIZ_COLLECTION,
      },
    ]),
  ],
  providers: [],
  exports: [MongooseModule],
})
export class DocDbModule {}
