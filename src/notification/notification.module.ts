import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/booking/entities/booking.entity';
import { SmsIrService } from 'src/common/services/sms-ir.service';

import { BookingSmsService } from './booking-sms.service';
import { ReminderService } from './reminder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  providers: [SmsIrService, BookingSmsService, ReminderService],
  exports: [BookingSmsService],
})
export class NotificationModule {}
