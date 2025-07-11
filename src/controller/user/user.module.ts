import { Module } from '@nestjs/common';
import { LoggingModule } from '../../service/logger/logging.module';
import { ConfigModule } from '../../service/config/config.module';
import { UserDbService } from '../../service/database/user-db.service';
import { DatabaseModule } from '../../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { RegistrationService } from '../../service/user/user.service';
import { UserController } from './user.controller';

@Module({
  imports: [ConfigModule, LoggingModule, DatabaseModule, JwtModule],
  controllers: [UserController],
  providers: [RegistrationService, UserDbService],
  exports: [RegistrationService],
})
export class UserModule {}
