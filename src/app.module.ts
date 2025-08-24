import { Module } from '@nestjs/common';
import { AppController } from './controller/app/app.controller';
import { AppService } from './service/app/app.service';
import { ConfigModule } from './service/config/config.module';
import { SwaggerConfigModule } from './config/swagger/swagger-config.module';
import { StorageModule } from './module/storage/storage.module';
import { LoggingModule } from './service/logger/logging.module';
import { AuthModule } from './module/auth/auth.module';
import { FileModule } from './module/file/file.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './module/user/user.module';
import { GptModule } from './module/gpt/gpt.module';
import { WorkflowModule } from './module/workflow/workflow.module';
import { QuizModule } from './module/quiz/quiz.module';
import { UserQuizResultModule } from './module/user-quiz-result/user-quiz-result.module';
import { ConfigController } from './controller/config/config.controller';

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
  controllers: [AppController, ConfigController],
  providers: [AppService],
})
export class AppModule {}
