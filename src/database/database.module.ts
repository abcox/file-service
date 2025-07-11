import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../service/config/config.module';
import { AppConfigService } from '../service/config/config.service';
import { getDatabaseConfig } from './database.config';
import { FileEntity } from './entities/file.entity';
import { UserEntity } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: AppConfigService) => {
        const config = configService.getConfig();
        const dbConfig = getDatabaseConfig(config);
        console.log(
          'Final database config:',
          JSON.stringify(dbConfig, null, 2),
        );
        return dbConfig;
      },
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([FileEntity, UserEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
