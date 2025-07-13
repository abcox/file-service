import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard';
import { JwtAuthService } from './jwt-auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '../service/config/config.module';
import { AppConfigService } from '../service/config/config.service';
import { LoggingModule } from '../service/logger/logging.module';
import { LoggerService } from '../service/logger/logger.service';
import { UserDbService } from '../service/database/user-db.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule, LoggingModule],
      useFactory: (configService: AppConfigService, logger: LoggerService) => {
        // 1. Try config service first (with error handling)
        let configSecret: string | undefined;
        try {
          const config = configService.getConfig();
          configSecret = config.auth?.secret;
        } catch {
          logger.warn(
            'Config service not ready yet, will use environment fallback',
          );
          configSecret = undefined;
        }

        // 2. Fallback to environment variable
        const envSecret = process.env.JWT_SECRET;

        const defaultSecret = 'missing-secret';

        // 3. Final fallback to undefined (which would cause JWT to fail)
        const secret = configSecret || envSecret || defaultSecret;

        if (secret === defaultSecret) {
          logger.error('JWT secret is missing');
          throw new Error('JWT secret is missing');
        }

        const secretPreview = configSecret
          ? configSecret.length > 10
            ? configSecret.substring(0, 5) +
              '...' +
              configSecret.substring(configSecret.length - 5)
            : configSecret
          : 'undefined';

        logger.log('JWT Module initialized successfully');
        logger.log(`Secret preview: ${secretPreview}`);

        return {
          secret: secret,
          // Using this causes any token with 'exp' to be rejected
          // Either set expiresIn, or use 'exp' in the token payload
          //signOptions: { expiresIn: '1y' },
        };
      },
      inject: [AppConfigService, LoggerService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtAuthService,
    JwtAuthGuard,
    UserDbService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [JwtAuthService, JwtAuthGuard, UserDbService],
})
export class AuthModule {}
