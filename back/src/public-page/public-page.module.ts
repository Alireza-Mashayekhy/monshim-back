import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberModule } from 'src/barber/barber.module';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { Payment } from 'src/payment/entities/payment.entity';

import { BarberPublicPagePurchase } from './entities/barber-public-page-purchase.entity';
import { PublicPageController } from './public-page.controller';
import { PublicPageService } from './public-page.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BarberPublicPagePurchase,
      BarberProfile,
      Booking,
      Payment,
    ]),
    // `BarberService` برای خواندن پروفایل عمومی و فهرست آرایشگرهای واجد شرایط
    BarberModule,
  ],
  controllers: [PublicPageController],
  providers: [PublicPageService],
  exports: [PublicPageService],
})
export class PublicPageModule {}
