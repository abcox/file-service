import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard';
import { JwtAuthService } from './jwt-auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '../service/config/config.module';
import { AppConfigService } from '../service/config/config.service';
import { LoggingModule } from '../service/logger/logging.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => {
        // Use environment variable set during pre-bootstrap
        const secret = process.env.JWT_SECRET || 'fallback-secret';

        // Log what secret the JWT module is being configured with
        console.log('🔧 JWT Module Initialization:');
        console.log(`   Secret length: ${secret.length}`);
        console.log(
          `   Secret preview: ${secret.length > 10 ? secret.substring(0, 5) + '...' + secret.substring(secret.length - 5) : secret}`,
        );
        console.log(`   Full secret: ${secret}`);
        console.log(`   Using fallback: ${!process.env.JWT_SECRET}`);

        return {
          secret: secret,
          signOptions: { expiresIn: '1y' },
        };
      },
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtAuthService,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [JwtAuthService, JwtAuthGuard],
})
export class AuthModule {}
