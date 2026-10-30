import { JwtService } from '@nestjs/jwt';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

import { createAuthAwareTracker } from '../utils/throttle-tracker.util';

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
 *
 * برای اینکه حتی در همان حالتِ `TRUST_PROXY` خاموش هم نشستِ کاربرها از بین
 * نرود، شمارش درخواست‌های **احراز هویت شده** بر اساس شناسهٔ کاربر انجام
 * می‌شود نه IP (توضیح کامل در `throttle-tracker.util.ts`). درخواست‌های بدون
 * توکن (ورود، OTP، مهمان) مثل قبل با IP شمرده می‌شوند تا محافظت در برابر
 * brute-force دست‌نخورده بماند.
 */
/** هنگام بالا آمدن سرویس خوانده می‌شود (بدون restart قابل تغییر است). */
export function readThrottleSettings() {
  return {
    ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 120),
  };
}

export function createThrottlerOptions(
  jwtService?: JwtService,
): ThrottlerModuleOptions {
  const { ttl, limit } = readThrottleSettings();
  /**
   * `JwtService` در `AuthModule` به‌صورت `global: true` ثبت شده است. اگر به هر
   * دلیلی در دسترس نبود، یک نمونهٔ مستقل ساخته می‌شود تا بالا آمدنِ سرویس هرگز
   * به‌خاطر محدودیت نرخ شکست نخورد (سکرت در هر فراخوانی به‌صراحت پاس داده
   * می‌شود، پس این نمونه به تنظیماتِ ماژول نیازی ندارد).
   */
  const jwt = jwtService ?? new JwtService({});

  return [
    {
      ttl,
      limit,
      getTracker: createAuthAwareTracker(jwt),
    },
  ];
}
