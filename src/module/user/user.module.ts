import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../../module/auth/auth.module';
import { StorageModule } from '../../module/storage/storage.module';
import { UserQuizResultModule } from '../../module/user-quiz-result/user-quiz-result.module';
import { ConfigModule } from '../../service/config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { UserDbService } from '../../service/database/user-db.service';
import { LoggingModule } from '../../service/logger/logging.module';

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
