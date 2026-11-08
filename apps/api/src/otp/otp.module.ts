import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { SmsIrService } from 'src/common/services/sms-ir.service';

import { OtpService } from './otp.service';

@Module({
  imports: [CacheModule.register()],
  providers: [OtpService, SmsIrService],
  exports: [OtpService],
})
export class OtpModule {}
