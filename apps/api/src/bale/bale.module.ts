import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { SubscriptionPlan } from 'src/subscription/entities/subscription-plan.entity';
import { User } from 'src/users/entities/user.entity';
import { BankCard } from 'src/wallet/entities/bank-card.entity';
import { Transaction } from 'src/wallet/entities/transaction.entity';

import { BaleController } from './bale.controller';
import { BaleBotService } from './bale-bot.service';
import { BaleClientService } from './bale-client.service';
import { BaleNotificationService } from './bale-notification.service';
import { BaleReportService } from './bale-report.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Booking,
      Transaction,
      BankCard,
      User,
      BarberProfile,
      SubscriptionPlan,
    ]),
  ],
  controllers: [BaleController],
  providers: [
    BaleClientService,
    BaleNotificationService,
    BaleReportService,
    BaleBotService,
  ],
  exports: [BaleClientService, BaleNotificationService, BaleReportService],
})
export class BaleModule {}
