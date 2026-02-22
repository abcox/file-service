import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { StripeService } from './stripe/stripe.service';
import { PaymentController } from './payment.controller';
import { DiagnosticModule } from '../diagnostic/diagnostic.module';

@Module({
  imports: [ConfigModule, DiagnosticModule],
  controllers: [PaymentController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}
