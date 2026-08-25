import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BarberModule } from 'src/barber/barber.module';
import { jwtConstants } from 'src/common/constants/constants';
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
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: `30d` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
