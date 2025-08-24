import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserQuizResultController } from './user-quiz-result.controller';
import { UserQuizResultService } from './user-quiz-result.service';
import {
  UserQuizActionSchema,
  UserQuizResultSchema,
} from '../db/doc/schema/user-quiz-result.schema';
import {
  USER_QUIZ_ACTION_COLLECTION,
  USER_QUIZ_RESULT_COLLECTION,
} from '../db/doc/doc-db.constants';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: 'UserQuizResult',
        schema: UserQuizResultSchema,
        collection: USER_QUIZ_RESULT_COLLECTION,
      },
      {
        name: 'UserQuizAction',
        schema: UserQuizActionSchema,
        collection: USER_QUIZ_ACTION_COLLECTION,
      },
    ]),
  ],
  controllers: [UserQuizResultController],
  providers: [UserQuizResultService],
  exports: [UserQuizResultService],
})
export class UserQuizResultModule {}
