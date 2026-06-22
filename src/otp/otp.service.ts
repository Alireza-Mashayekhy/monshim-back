import { BadRequestException, Injectable } from '@nestjs/common';

import { RedisService } from '../redis/redis.service';

@Injectable()
export class OtpService {
  constructor(private readonly redisService: RedisService) {}

  async sendOtp(phone: string) {
    const redis = this.redisService.getClient();

    const code = Math.floor(1000 + Math.random() * 9000).toString();

    await redis.set(`otp:${phone}`, code, {
      EX: 120,
    });

    console.log(code);

    // sms provider

    return {
      message: 'otp sent',
      otp: code,
    };
  }

  async verifyOtp(phone: string, code: string) {
    const redis = this.redisService.getClient();

    const storedCode = await redis.get(`otp:${phone}`);

    if (!storedCode) {
      throw new BadRequestException('otp expired');
    }

    if (storedCode !== code) {
      throw new BadRequestException('invalid otp');
    }

    await redis.del(`otp:${phone}`);

    return true;
  }
}
