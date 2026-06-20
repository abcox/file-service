import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { StripeService } from './stripe/stripe.service';
import { PaymentController } from './payment.controller';
import { DiagnosticModule } from '../diagnostic/diagnostic.module';
import { PaymentCheckoutService } from './payment-checkout.service';

@Module({
  imports: [ConfigModule, DiagnosticModule],
  controllers: [PaymentController],
  providers: [StripeService, PaymentCheckoutService],
  exports: [StripeService],
})
export class PaymentModule {}
