import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { StripeService } from './stripe/stripe.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}
