import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/booking/entities/booking.entity';
import { FilesModule } from 'src/files/files.module';
import { User } from 'src/users/entities/user.entity';

import { BarberAdminController } from './barber.admin.controller';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';
import { BarberReviewAdminController } from './barber-review.admin.controller';
import {
  BarberReviewController,
  MyBarberReviewController,
} from './barber-review.controller';
import { BarberReviewService } from './barber-review.service';
import { BarberProfile } from './entities/barber.entity';
import { BarberReview } from './entities/barber-review.entity';
import { BarberWorkHours } from './entities/barber-work-hours.entity';
import { WorkHoursService } from './work-hours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BarberProfile,
      BarberReview,
      Booking,
      User,
      BarberWorkHours,
    ]),
    FilesModule,
  ],
  controllers: [
    BarberController,
    BarberReviewController,
    MyBarberReviewController,
    BarberAdminController,
    BarberReviewAdminController,
  ],
  providers: [BarberService, BarberReviewService, WorkHoursService],
  exports: [BarberService, BarberReviewService, WorkHoursService],
})
export class BarberModule {}
