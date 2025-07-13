import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from '../../service/chatGpt/gpt.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { ConfigModule } from '../../service/config/config.module';

@Module({
  imports: [LoggingModule, ConfigModule],
  controllers: [GptController],
  providers: [GptService],
  exports: [GptService],
})
export class GptModule {}
