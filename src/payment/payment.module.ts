import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from 'src/booking/booking.module';
import { Booking } from 'src/booking/entities/booking.entity';
import { Service } from 'src/services/entities/service.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { UserSubscription } from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { WalletModule } from 'src/wallet/wallet.module';

import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      User,
      SubscriptionPlan,
      UserSubscription,
      Service,
      Booking,
    ]),
    BookingModule,
    WalletModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
