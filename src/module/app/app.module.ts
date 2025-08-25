import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '../config/config.module';
import { SwaggerConfigModule } from '../../config/swagger/swagger-config.module';
import { StorageModule } from '../storage/storage.module';
import { LoggingModule } from '../logger/logging.module';
import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { DatabaseModule } from '../../database/database.module';
import { UserModule } from '../user/user.module';
import { GptModule } from '../gpt/gpt.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { QuizModule } from '../quiz/quiz.module';
import { UserQuizResultModule } from '../user-quiz-result/user-quiz-result.module';
import { ConfigController } from '../config/config.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    ConfigModule,
    SwaggerConfigModule,
    StorageModule,
    LoggingModule,
    AuthModule,
    FileModule,
    DatabaseModule,
    UserModule,
    GptModule,
    WorkflowModule,
    QuizModule,
    UserQuizResultModule,
    PdfModule,
  ],
  controllers: [AppController, ConfigController],
  providers: [AppService],
})
export class AppModule {}
