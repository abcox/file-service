import { Module } from '@nestjs/common';
import { AppController } from './controller/app/app.controller';
import { AppService } from './service/app/app.service';
import { ConfigModule } from './service/config/config.module';
import { SwaggerConfigModule } from './config/swagger/swagger-config.module';
import { StorageModule } from './service/storage/storage.module';
import { LoggingModule } from './service/logger/logging.module';
import { AuthModule } from './auth/auth.module';
import { FileController } from './controller/file/file.controller';
import { FileModule } from './controller/file/file.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';
import { ConfigController } from './controller/config/config.controller';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './controller/user/user.module';
import { GptModule } from './controller/gpt/gpt.module';
import { WorkflowModule } from './controller/workflow/workflow.module';
import { QuizModule } from './module/quiz/quiz.module';
import { QuizController } from './module/quiz/quiz.controller';
import { UserQuizResultModule } from './module/user-quiz-result/user-quiz-result.module';
import { UserQuizResultController } from './module/user-quiz-result/user-quiz-result.controller';

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
  ],
  controllers: [
    AppController,
    FileController,
    ConfigController,
    QuizController,
    UserQuizResultController,
  ],
  providers: [AppService, SwaggerConfigService],
})
export class AppModule {}
