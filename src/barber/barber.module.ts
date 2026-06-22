import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

import { BarberController } from './barber.controller';
import { BarberService } from './barber.service';
import { BarberProfile } from './entities/barber.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BarberProfile, User])],
  controllers: [BarberController],
  providers: [BarberService],
  exports: [BarberService],
})
export class BarberModule {}
