import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-redis-yet';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BarberModule } from './barber/barber.module';
import { TypeOrmConfigService } from './common/config/typeorm.config';
import { FilesModule } from './files/files.module';
import { LocationsModule } from './locations/locations.module';
import { OtpModule } from './otp/otp.module';
import { RedisModule } from './redis/redis.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6381', 10) || 6379,
          },
          ttl: 86400, // ۱ روز (به ثانیه)
        }),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
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
