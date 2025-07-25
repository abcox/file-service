import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/service/config/config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        uri: configService.getConfig().azure.cosmosDb?.connectionString || '',
        dbName: configService.getConfig().azure.cosmosDb?.database || '',
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class DocDbModule {}
