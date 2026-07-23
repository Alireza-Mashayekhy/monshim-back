// src/otp/otp.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';

import { SmsIrService } from '../common/services/sms-ir.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly redisService: RedisService,
    private readonly smsIrService: SmsIrService,
  ) {}

  async sendOtp(phone: string) {
    const redis = this.redisService.getClient();

    // تولید کد ۶ رقمی (یا ۴ رقمی)
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // ذخیره در Redis با انقضای ۱۲۰ ثانیه
    await redis.set(`otp:${phone}`, code, {
      EX: 120,
    });

    // ارسال پیامک با استفاده از قالب
    await this.smsIrService.sendVerify(phone, [{ name: 'OTP', value: code }]);

    return {
      message: 'کد تأیید با موفقیت ارسال شد',
    };
  }

  async verifyOtp(phone: string, code: string) {
    const redis = this.redisService.getClient();

    const storedCode = await redis.get(`otp:${phone}`);

    if (!storedCode) {
      throw new BadRequestException('کد تأیید منقضی شده است');
    }

    if (storedCode !== code) {
      throw new BadRequestException('کد تأیید نامعتبر است');
    }

    await redis.del(`otp:${phone}`);

    return true;
  }
}
