import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarberModule } from 'src/barber/barber.module';
import { BarberProfile } from 'src/barber/entities/barber.entity';
import { Booking } from 'src/booking/entities/booking.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Referral } from 'src/referral/entities/referral.entity';

import { BarberPublicPagePurchase } from './entities/barber-public-page-purchase.entity';
import { PublicPageDiscount } from './entities/public-page-discount.entity';
import { PublicPageController } from './public-page.controller';
import { PublicPageService } from './public-page.service';
import { PublicPageDiscountAdminController } from './public-page-discount.admin.controller';
import { PublicPageSchemaService } from './public-page-schema.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BarberPublicPagePurchase,
      PublicPageDiscount,
      BarberProfile,
      Booking,
      Payment,
      Referral,
    ]),
    // `BarberService` برای خواندن پروفایل عمومی و فهرست آرایشگرهای واجد شرایط
    BarberModule,
  ],
  controllers: [PublicPageController, PublicPageDiscountAdminController],
  providers: [PublicPageService, PublicPageSchemaService],
  exports: [PublicPageService],
})
export class PublicPageModule {}
