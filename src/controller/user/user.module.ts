import { Module } from '@nestjs/common';
import { LoggingModule } from '../../service/logger/logging.module';
import { ConfigModule } from '../../service/config/config.module';
import { UserDbService } from '../../service/database/user-db.service';
import { DatabaseModule } from '../../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../../service/user/user.service';
import { UserController } from './user.controller';
import { StorageModule } from '../../service/storage/storage.module';
import { AuthModule } from '../../auth/auth.module';
import { UserQuizResultModule } from '../../module/user-quiz-result/user-quiz-result.module';
import { AuthService } from '../../auth/auth.service';

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
  providers: [UserService, UserDbService, AuthService],
  exports: [UserService],
})
export class UserModule {}
