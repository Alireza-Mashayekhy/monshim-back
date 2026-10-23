import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BaleModule } from './bale/bale.module';
import { BarberModule } from './barber/barber.module';
import { BookingModule } from './booking/booking.module';
import { ClubModule } from './club/club.module';
import { TypeOrmConfigService } from './common/config/typeorm.config';
import { FilesModule } from './files/files.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationModule } from './notification/notification.module';
import { OtpModule } from './otp/otp.module';
import { PaymentModule } from './payment/payment.module';
import { PublicPageModule } from './public-page/public-page.module';
import { RedisModule } from './redis/redis.module';
import { ReferralModule } from './referral/referral.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TicketModule } from './ticket/ticket.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

/**
 * محدودیت نرخ سراسری.
 *
 * مقدار قبلی (۱۰ درخواست در دقیقه برای هر IP) عملاً کل سایت را قفل می‌کرد:
 * یک کاربر با باز کردن چند صفحه و چند درخواست هم‌زمان به سقف می‌خورد.
 * مقدار پیش‌فرض ۱۲۰ در دقیقه است و از محیط قابل تنظیم است.
 *
 * نکتهٔ مهم: اگر سرویس پشت reverse proxy است، باید `TRUST_PROXY=true`
 * تنظیم شود تا IP واقعی کاربر دیده شود؛ در غیر این صورت همهٔ کاربران
 * یک IP مشترک دارند و این سقف بین همه تقسیم می‌شود.
 */
const THROTTLE_TTL_MS = Number(process.env.THROTTLE_TTL_MS ?? 60_000);
const THROTTLE_LIMIT = Number(process.env.THROTTLE_LIMIT ?? 120);

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    ScheduleModule.forRoot(),
    // CacheModule.registerAsync({
    //   useFactory: async () => ({
    //     store: await redisStore({
    //       socket: {
    //         host: process.env.REDIS_HOST || 'localhost',
    //         port: parseInt(process.env.REDIS_PORT || '6381', 10) || 6379,
    //       },
    //       ttl: 86400, // ۱ روز (به ثانیه)
    //     }),
    //   }),
    // }),
    ThrottlerModule.forRoot([
      {
        ttl: THROTTLE_TTL_MS,
        limit: THROTTLE_LIMIT,
      },
    ]),
    FilesModule,
    UsersModule,
    AuthModule,
    RedisModule,
    OtpModule,
    BarberModule,
    ServicesModule,
    LocationsModule,
    BookingModule,
    WalletModule,
    ReferralModule,
    SettingsModule,
    SubscriptionModule,
    TicketModule,
    ClubModule,
    PaymentModule,
    PublicPageModule,
    NotificationModule,
    BaleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
