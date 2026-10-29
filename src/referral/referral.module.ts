// src/referral/referral.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { PublicPageModule } from 'src/public-page/public-page.module';
import { WalletModule } from 'src/wallet/wallet.module';

import { Referral } from './entities/referral.entity';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, BarberProfile]),
    WalletModule,
    PublicPageModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
