import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { User } from 'src/users/entities/user.entity';

import { BarberAdminController } from './barber.admin.controller';
import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';
import { BarberProfile } from './entities/barber.entity';
import { BarberWorkHours } from './entities/barber-work-hours.entity';
import { WorkHoursService } from './work-hours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BarberProfile, User, BarberWorkHours]),
    FilesModule,
  ],
  controllers: [BarberController, BarberAdminController],
  providers: [BarberService, WorkHoursService],
  exports: [BarberService, WorkHoursService],
})
export class BarberModule {}
