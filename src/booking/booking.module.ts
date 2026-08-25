import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { BarberWorkHours } from 'src/barber/entities/barber-work-hours.entity';
import { ReferralModule } from 'src/referral/referral.module';
import { Service } from 'src/services/entities/service.entity';
import { User } from 'src/users/entities/user.entity';

import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { Booking } from './entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BarberProfile,
      Service,
      User,
      BarberWorkHours,
    ]),
    ReferralModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingModule {}
