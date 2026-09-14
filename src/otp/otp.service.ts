// src/otp/otp.service.ts
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';

import { SmsIrService } from '../common/services/sms-ir.service';
import { RedisService } from '../redis/redis.service';

const OTP_TTL_SECONDS = 120; // اعتبار کد
const OTP_COOLDOWN_SECONDS = 60; // فاصلهٔ مجاز بین دو درخواست
const OTP_HOURLY_LIMIT = 5; // حداکثر تعداد درخواست در ساعت
const OTP_MAX_FAILS = 5; // حداکثر تلاش نامعتبر
const OTP_LOCK_SECONDS = 600; // مدت قفل شدن پس از تلاش‌های نامعتبر
const OTP_VERIFIED_TTL_SECONDS = 600;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

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
    if (hourlyCount >= OTP_HOURLY_LIMIT) {
      throw new BadRequestException(
        'تعداد درخواست کد بیش از حد مجاز است. بعداً تلاش کنید',
      );
    }

    const code = randomInt(1000, 10000).toString();

    await redis.set(`otp:${phone}`, code, { EX: OTP_TTL_SECONDS });
    await redis.set(`otp:cooldown:${phone}`, '1', { EX: OTP_COOLDOWN_SECONDS });
    await redis.set(`otp:fail:${phone}`, '0', { EX: OTP_LOCK_SECONDS });
    // با صدور کد جدید، اعتبار کد قبلی (در پنجرهٔ تکمیل ثبت‌نام) باطل می‌شود
    await redis.del(`otp:verified:${phone}`);

    if (hourlyCount === 0) {
      await redis.set(`otp:count:${phone}`, '1', { EX: 3600 });
    } else {
      await redis.incr(`otp:count:${phone}`);
    }

    try {
      await this.smsIrService.sendVerify(phone, [{ name: 'OTP', value: code }]);
    } catch (error) {
      // ارسال پیامک ناموفق بود: کد و محدودیت‌ها پاک شوند تا کاربر
      // پشت سد زمانی نماند و کد بی‌استفاده در سیستم باقی نماند.
      this.logger.error(`sending OTP sms to ${phone} failed: ${String(error)}`);
      await Promise.all([
        redis.del(`otp:${phone}`),
        redis.del(`otp:cooldown:${phone}`),
        redis.del(`otp:fail:${phone}`),
        redis.del(`otp:verified:${phone}`),
        // سهمیهٔ ساعتی کاربر به‌خاطر خطای سرویس پیامک مصرف نشود
        hourlyCount === 0
          ? redis.del(`otp:count:${phone}`)
          : redis.decr(`otp:count:${phone}`),
      ]);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'ارسال پیامک ناموفق بود. لطفاً دوباره تلاش کنید',
      );
    }

    return {
      message: 'کد تأیید با موفقیت ارسال شد',
    };
  }

  /**
   * بررسی کد یکبارمصرف.
   * @param consume اگر false باشد، کد مصرف نمی‌شود و فقط صحت آن بررسی می‌شود
   * (برای مرحلهٔ «تأیید کد» در ثبت‌نام چندمرحله‌ای).
   */
  async verifyOtp(phone: string, code: string, consume = true): Promise<true> {
    const redis = this.redisService.getClient();

    const locked = await redis.get(`otp:lock:${phone}`);
    if (locked) {
      throw new BadRequestException(
        'تعداد تلاش نامعتبر زیاد است. کمی بعد دوباره تلاش کنید',
      );
    }

    const storedCode = await redis.get(`otp:${phone}`);

    if (storedCode) {
      if (!this.isCodeEqual(storedCode, code)) {
        await this.registerFailedAttempt(phone);
        throw new BadRequestException('کد تأیید نامعتبر است');
      }
      await redis.set(`otp:verified:${phone}`, storedCode, {
        EX: OTP_VERIFIED_TTL_SECONDS,
      });

      if (consume) {
        await redis.del(`otp:${phone}`);
        await redis.del(`otp:fail:${phone}`);
      }

      return true;
    }

    const verifiedCode = await redis.get(`otp:verified:${phone}`);
    if (verifiedCode) {
      if (!this.isCodeEqual(verifiedCode, code)) {
        await this.registerFailedAttempt(phone);
        throw new BadRequestException('کد تأیید نامعتبر است');
      }

      return true;
    }

    throw new BadRequestException(
      'کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید',
    );
  }

  private async registerFailedAttempt(phone: string): Promise<void> {
    const redis = this.redisService.getClient();

    const fails = await redis.incr(`otp:fail:${phone}`);
    if (fails === 1) {
      await redis.expire(`otp:fail:${phone}`, OTP_LOCK_SECONDS);
    }

    if (fails >= OTP_MAX_FAILS) {
      await Promise.all([
        redis.set(`otp:lock:${phone}`, '1', { EX: OTP_LOCK_SECONDS }),
        redis.set(`otp:cooldown:${phone}`, '1', { EX: OTP_LOCK_SECONDS }),
        redis.del(`otp:${phone}`),
        redis.del(`otp:fail:${phone}`),
        // پنجرهٔ تکمیل ثبت‌نام هم بسته شود تا راه فراری از قفل نباشد
        redis.del(`otp:verified:${phone}`),
      ]);

      throw new BadRequestException(
        'تعداد تلاش نامعتبر زیاد است. کمی بعد دوباره تلاش کنید',
      );
    }
  }

  /** مقایسهٔ امن کدها (مقاوم در برابر حملات زمان‌سنجی) */
  private isCodeEqual(storedCode: string, code: string): boolean {
    const stored = Buffer.from(storedCode);
    const received = Buffer.from(String(code ?? ''));

    if (stored.length !== received.length) {
      return false;
    }

    return timingSafeEqual(stored, received);
  }
}
