import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
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
import { createThrottlerOptions } from './common/config/throttler.config';
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
    // `JwtService` به‌صورت global در `AuthModule` ثبت شده و برای شناسایی
    // کاربرِ احراز هویت‌شده در محدودیت نرخ استفاده می‌شود (جلوگیری از
    // ۴۲۹ شدن `/auth/refresh` و لاگ‌اوت شدن کاربرها).
    ThrottlerModule.forRootAsync({
      inject: [{ token: JwtService, optional: true }],
      useFactory: createThrottlerOptions,
    }),
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
