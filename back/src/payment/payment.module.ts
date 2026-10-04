import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { Service } from 'src/services/entities/service.entity';
import { SiteSettings } from 'src/settings/entities/setting.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { UserSubscription } from 'src/subscription/entities/user-subscription.entity';
import { User } from 'src/users/entities/user.entity';
import { Transaction } from 'src/wallet/entities/transaction.entity';
import { WalletModule } from 'src/wallet/wallet.module';

import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      User,
      BarberProfile,
      BarberWorkHours,
      SubscriptionPlan,
      UserSubscription,
      Service,
      Booking,
      SiteSettings,
      Transaction,
    ]),
    NotificationModule,
    WalletModule,
  ],
  controllers: [PaymentController, AdminTransactionsController],
  providers: [PaymentService, AdminTransactionsService],
  exports: [PaymentService],
})
export class PaymentModule {}
