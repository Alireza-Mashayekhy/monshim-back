// src/otp/otp.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

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

    const cooldown = await redis.get(`otp:cooldown:${phone}`);
    if (cooldown) {
      throw new BadRequestException(
        'لطفاً کمی صبر کنید و دوباره درخواست کد دهید',
      );
    }

    const hourlyCountRaw = await redis.get(`otp:count:${phone}`);
    const hourlyCount = hourlyCountRaw ? Number(hourlyCountRaw) : 0;
    if (hourlyCount >= 5) {
      throw new BadRequestException(
        'تعداد درخواست کد بیش از حد مجاز است. بعداً تلاش کنید',
      );
    }

    const code = randomInt(1000, 10000).toString();

    await redis.set(`otp:${phone}`, code, { EX: 120 });
    await redis.set(`otp:cooldown:${phone}`, '1', { EX: 60 });
    await redis.set(`otp:fail:${phone}`, '0', { EX: 600 });

    if (hourlyCount === 0) {
      await redis.set(`otp:count:${phone}`, '1', { EX: 3600 });
    } else {
      await redis.incr(`otp:count:${phone}`);
    }

    await this.smsIrService.sendVerify(phone, [{ name: 'OTP', value: code }]);

    return {
      message: 'کد تأیید با موفقیت ارسال شد',
    };
  }

  async verifyOtp(phone: string, code: string) {
    const redis = this.redisService.getClient();

    const locked = await redis.get(`otp:lock:${phone}`);
    if (locked) {
      throw new BadRequestException(
        'تعداد تلاش نامعتبر زیاد است. کمی بعد دوباره تلاش کنید',
      );
    }

    const storedCode = await redis.get(`otp:${phone}`);

    if (!storedCode) {
      throw new BadRequestException('کد تأیید منقضی شده است');
    }

    if (storedCode !== code) {
      const fails = await redis.incr(`otp:fail:${phone}`);
      if (fails === 1) {
        await redis.expire(`otp:fail:${phone}`, 600);
      }
      if (fails >= 5) {
        await redis.set(`otp:lock:${phone}`, '1', { EX: 600 });
        await redis.del(`otp:${phone}`);
      }
      throw new BadRequestException('کد تأیید نامعتبر است');
    }

    await redis.del(`otp:${phone}`);
    await redis.del(`otp:fail:${phone}`);

    return true;
  }
}
