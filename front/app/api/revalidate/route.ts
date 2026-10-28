import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { revalidateBarberPublicCache } from '@/lib/public-cache';

/**
 * وبهوکِ on-demand revalidation برای بک‌اند.
 *
 * چرا؟ پنل ادمین و پنل آرایشگر (فرانت) پس از هر تغییر خودشان کش را تازه
 * می‌کنند، اما تغییرِ وضعیتِ تایید ممکن است از مسیرهای دیگری هم انجام شود
 * (مثلاً اسکریپت/اپ/ربات مدیریتی که مستقیم با API حرف می‌زند). در آن حالت
 * بک‌اند بعد از ذخیره‌سازی، این وبهوک را صدا می‌زند تا صفحهٔ عمومی آرایشگر
 * فوراً از نو ساخته شود.
 *
 * فعال‌سازی: در هر دو سرویس `REVALIDATE_SECRET` هم‌مقدار باشد. اگر تنظیم
 * نشده باشد این مسیر ۵۰۳ می‌دهد (هرگز بدون احراز هویت کش پاک نمی‌شود).
 *
 * نمونهٔ بدنه:
 *   { "userId": 42, "slugs": ["salon-royal"] }
 */
export const dynamic = 'force-dynamic';

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn(
      '[revalidate] REVALIDATE_SECRET تنظیم نشده است؛ درخواست پاک‌سازی کش رد شد.',
    );
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_SECRET is not configured' },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get('x-revalidate-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  if (!secretsMatch(provided, secret)) {
    return NextResponse.json(
      { revalidated: false, error: 'invalid secret' },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: number | string | null;
    slugs?: Array<string | null | undefined>;
  } | null;

  const ok = revalidateBarberPublicCache({
    userId: body?.userId ?? null,
    slugs: Array.isArray(body?.slugs) ? body.slugs : [],
  });

  return NextResponse.json({ revalidated: ok, now: Date.now() });
}
