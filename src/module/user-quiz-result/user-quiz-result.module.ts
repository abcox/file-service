import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserQuizResultController } from './user-quiz-result.controller';
import { UserQuizResultService } from './user-quiz-result.service';
import { UserQuizResultSchema } from '../db/doc/schema/user-quiz-result.schema';
import { USER_QUIZ_RESULT_COLLECTION } from '../db/doc/doc-db.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'UserQuizResult',
        schema: UserQuizResultSchema,
        collection: USER_QUIZ_RESULT_COLLECTION,
      },
    ]),
  ],
  controllers: [UserQuizResultController],
  providers: [UserQuizResultService],
  exports: [UserQuizResultService],
})
export class UserQuizResultModule {}
