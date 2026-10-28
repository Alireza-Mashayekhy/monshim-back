import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/booking/entities/booking.entity';
import { FrontendRevalidationService } from 'src/common/services/frontend-revalidation.service';
import { FilesModule } from 'src/files/files.module';
import { City } from 'src/locations/entities/city.entity';
import { Province } from 'src/locations/entities/province.entity';
import { NotificationModule } from 'src/notification/notification.module';
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
      City,
      Province,
    ]),
    FilesModule,
    NotificationModule,
  ],
  controllers: [
    BarberController,
    BarberReviewController,
    MyBarberReviewController,
    BarberAdminController,
    BarberReviewAdminController,
  ],
  providers: [
    BarberService,
    BarberReviewService,
    WorkHoursService,
    FrontendRevalidationService,
  ],
  exports: [
    BarberService,
    BarberReviewService,
    WorkHoursService,
    FrontendRevalidationService,
  ],
})
export class BarberModule {}
