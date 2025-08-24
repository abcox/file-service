import { Module } from '@nestjs/common';
import { SwaggerConfigService } from './swagger-config.service';
import { ConfigModule } from '../../module/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [SwaggerConfigService],
  exports: [SwaggerConfigService],
})
export class SwaggerConfigModule {}
