import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BarberModule } from 'src/barber/barber.module';
import { FilesModule } from 'src/files/files.module';
import { OtpModule } from 'src/otp/otp.module';
import { ReferralModule } from 'src/referral/referral.module';
import { ServicesModule } from 'src/services/services.module';
import { UsersModule } from 'src/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    OtpModule,
    BarberModule,
    ServicesModule,
    FilesModule,
    ReferralModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '6h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
