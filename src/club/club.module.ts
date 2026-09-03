import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { User } from 'src/users/entities/user.entity';

import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { ClubCustomer } from './entities/club-customer.entity';
import { CustomerGroup } from './entities/customer-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClubCustomer,
      CustomerGroup,
      BarberProfile,
      User,
    ]),
  ],
  controllers: [ClubController],
  providers: [ClubService],
  exports: [ClubService],
})
export class ClubModule {}
