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
import { ContactModule } from '../contact/contact.module';
import { AssetModule } from '../asset/asset.module';
import { GmailModule } from '../gmail/gmail.module';
import { EmailTemplateModule } from '../email-template/email-template.module';
import { PeopleModule } from '../google/people';
import { CalendarModule } from '../google/calendar/calendar.module';
import { PaymentModule } from '../payment/payment.module';

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
    ContactModule,
    AssetModule,
    GmailModule,
    EmailTemplateModule,
    PeopleModule,
    CalendarModule,
    PaymentModule,
  ],
  controllers: [AppController, ConfigController],
  providers: [AppService],
})
export class AppModule {}
