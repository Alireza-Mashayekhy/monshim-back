/**
 * شناسایی کاربر برای محدودیت نرخ (Throttler).
 *
 * چرا این فایل لازم است؟
 * ------------------------
 * گارد پیش‌فرض `@nestjs/throttler` هر درخواست را با **IP** می‌شمارد. وقتی سرویس
 * پشت reverse proxy (nginx/ترافیک/لیارا) باشد و `TRUST_PROXY` روشن نباشد، همهٔ
 * درخواست‌ها با IP خودِ پروکسی دیده می‌شوند؛ یعنی **کل کاربرهای سایت یک سطل
 * مشترک ۱۲۰ درخواست در دقیقه** دارند. نتیجهٔ عملی‌اش دو باگ جدی بود:
 *   ۱. `POST /auth/refresh` با ۴۲۹ رد می‌شد و فرانت آن را «انقضای نشست»
 *      تفسیر می‌کرد → کاربر با وجود رفرش‌توکنِ معتبر لاگ‌اوت می‌شد؛
 *   ۲. صفحه‌های پنل به‌صورت تصادفی ۴۲۹ می‌گرفتند و «بررسی نشست انجام نشد»
 *      نمایش داده می‌شد.
 *
 * راه‌حل: درخواستِ کاربرِ **احراز هویت شده** با شناسهٔ خودش شمرده می‌شود
 * (`user:<id>`) و فقط درخواست‌های بدون توکن با IP (`ip:<ip>`) — تا محافظت در
 * برابر brute-force روی ورود/OTP بدون تغییر بماند.
 *
 * نکتهٔ امنیتی: شناسهٔ کاربر فقط از توکنی خوانده می‌شود که **امضایش با سکرت
 * سرور تایید شده باشد**؛ بنابراین کسی نمی‌تواند با توکنِ جعلی و جابه‌جا کردن
 * `id` برای خودش سطلِ نامحدود بسازد. از آنجا که در لحظهٔ رفرش، توکن دسترسی
 * معمولاً منقضی است، اعتبارسنجی با `ignoreExpiration` انجام می‌شود (امضا همچنان
 * بررسی می‌شود؛ فقط انقضا نادیده گرفته می‌شود) تا همان کاربر سطل خودش را داشته
 * باشد و به سطل مشترک IP نیفتد.
 */
import { JwtService } from '@nestjs/jwt';

import {
  getAccessTokenSecret,
  getRefreshTokenSecret,
} from '../config/jwt.config';
import { extractAccessToken, extractRefreshToken } from './auth-cookie.util';

export type ThrottleTokenKind = 'access' | 'refresh';

interface TrackerRequest {
  cookies?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  ips?: string[];
}

/**
 * خواندن شناسهٔ کاربر از یک توکن امضاشده.
 * هر خطایی (نبودِ سکرت، توکن مخدوش، امضای نامعتبر) یعنی «ناشناس» → `null`.
 */
export async function readUserIdFromToken(
  jwtService: JwtService,
  token: string,
  kind: ThrottleTokenKind,
): Promise<number | null> {
  try {
    const secret =
      kind === 'access' ? getAccessTokenSecret() : getRefreshTokenSecret();
    const payload = await jwtService.verifyAsync<{
      id?: unknown;
      sub?: unknown;
    }>(token, {
      secret,
      // انقضا برای «شمارش درخواست» مهم نیست؛ امضا مهم است.
      ignoreExpiration: true,
    });

    const userId = Number(payload?.id ?? payload?.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

/** IP درخواست، دقیقاً همان چیزی که گارد پیش‌فرض استفاده می‌کند. */
export function trackerFromIp(request: TrackerRequest): string {
  const ip = request.ip ?? request.ips?.[0];
  return `ip:${ip || 'unknown'}`;
}

/**
 * کلیدِ شمارش درخواست: کاربرِ احراز هویت شده با شناسهٔ خودش و بقیه با IP.
 */
export async function resolveRequestTracker(
  jwtService: JwtService,
  request: TrackerRequest,
): Promise<string> {
  // `extract*Token` شکلِ استانداردِ Express را انتظار دارد؛ این نرمال‌سازی
  // باعث می‌شود گارد با هر شکلِ درخواستی (تست/اداپتور متفاوت) خطا ندهد.
  const normalized = {
    ...request,
    headers: request.headers ?? {},
    cookies: request.cookies ?? {},
  } as TrackerRequest;

  const accessToken = extractAccessToken(normalized as never);
  if (accessToken) {
    const userId = await readUserIdFromToken(jwtService, accessToken, 'access');
    if (userId) return `user:${userId}`;
  }

  // لحظهٔ `POST /auth/refresh` معمولاً توکن دسترسی منقضی/حذف شده است، اما
  // رفرش‌توکن موجود است؛ بدون این شاخه دقیقاً همان درخواست به سطل مشترک IP
  // می‌افتاد و با ۴۲۹ نشست کاربر را از بین می‌برد.
  const refreshToken = extractRefreshToken(normalized as never);
  if (refreshToken) {
    const userId = await readUserIdFromToken(
      jwtService,
      refreshToken,
      'refresh',
    );
    if (userId) return `user:${userId}`;
  }

  return trackerFromIp(request);
}

/**
 * ساخت تابع `getTracker` برای `ThrottlerModule`.
 * خروجی با امضای `ThrottlerGetTrackerFunction` سازگار است.
 */
export function createAuthAwareTracker(jwtService: JwtService) {
  return (request: Record<string, unknown>): Promise<string> =>
    resolveRequestTracker(jwtService, request);
}
