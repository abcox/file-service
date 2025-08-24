import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { UserQuizResultModule } from '../user-quiz-result/user-quiz-result.module';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { UserDbService } from '../../database/service/user-db.service';
import { LoggingModule } from '../logger/logging.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    JwtModule,
    StorageModule,
    AuthModule,
    UserQuizResultModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserDbService],
  exports: [UserService],
})
export class UserModule {}
