import type { Request } from 'express';

/**
 * کمک‌کننده‌های ساخت URL عمومی (ریدایرکت درگاه پرداخت، لینک صفحهٔ آرایشگاه و ...).
 *
 * مقدار `APP_URL` و `FRONTEND_URL` در `.env` سرور ممکن است اشتباه باشد
 * (مثلاً `http://localhost:3000` یا `https://monshiim.ir/panel`). چون این
 * آدرس‌ها به مرورگر مشتری فرستاده می‌شوند، خطای کوچک در آن‌ها یعنی
 * ریدایرکت کاربر به localhost یا مسیر تکراری. اینجا همه‌چیز به «origin»
 * (پروتکل + هاست) تبدیل می‌شود و در صورت نبود مقدار درست، از origin
 * درخواست فعلی استفاده می‌شود.
 */

export const DEFAULT_APP_ORIGIN = 'http://localhost:4000';
export const DEFAULT_FRONT_ORIGIN = 'http://localhost:3000';

/** میزبان‌هایی که فقط در محیط توسعه معنا دارند */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * فقط origin را برمی‌گرداند: `https://monshiim.ir/panel/` → `https://monshiim.ir`.
 * هر مسیر، کوئری، هش و اسلش انتهایی حذف می‌شود تا آدرس‌هایی مثل
 * `.../panel` یا `.../api` باعث مسیر تکراری (`/panel/panel/...`) نشوند.
 *
 * برای مقدار نامعتبر یا غیر http(s) مقدار `null` برمی‌گردد.
 */
export function normalizeOrigin(value?: string | null): string | null {
  const raw = String(value ?? '').trim();

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** آیا این آدرس روی میزبان محلی (localhost/127.0.0.1/...) است؟ */
export function isLocalOrigin(value?: string | null): boolean {
  const origin = normalizeOrigin(value);

  if (!origin) return false;

  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export interface ResolvedOrigin {
  origin: string;
  source: 'config' | 'request' | 'default';
}

/**
 * انتخاب origin عمومی با اولویت:
 *   ۱. مقدار env (اگر معتبر باشد و در production لوکال نباشد)
 *   ۲. origin همان درخواست (هاست عمومی که کاربر با آن به سرور رسیده)
 *   ۳. مقدار پیش‌فرض لوکال
 *
 * حالت ۲ جلوی شکستن پرداخت روی سرور را می‌گیرد؛ مثلاً وقتی `FRONTEND_URL`
 * ست نشده یا به `localhost` اشاره می‌کند.
 */
export function resolvePublicOrigin(params: {
  configured?: string | null;
  requestOrigin?: string | null;
  fallback: string;
  isProduction: boolean;
}): ResolvedOrigin {
  const configured = normalizeOrigin(params.configured);
  const configuredIsUsable =
    configured !== null && !(params.isProduction && isLocalOrigin(configured));

  if (configuredIsUsable) {
    return { origin: configured, source: 'config' };
  }

  const fromRequest = normalizeOrigin(params.requestOrigin);

  if (fromRequest) {
    return { origin: fromRequest, source: 'request' };
  }

  if (configured) {
    return { origin: configured, source: 'config' };
  }

  return {
    origin: normalizeOrigin(params.fallback) ?? params.fallback,
    source: 'default',
  };
}

/** اولین مقدار یک هدر که ممکن است لیستِ ویرگول‌دار باشد (مثل x-forwarded-for) */
function firstHeaderValue(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) return null;

  const first = raw.split(',')[0].trim();

  return first || null;
}

/**
 * origin عمومی درخواست جاری؛ با احترام به هدرهای پروکسی (nginx).
 * برای درخواست‌هایی که از مرورگر می‌آیند، همان دامنه‌ای است که کاربر
 * با آن سایت را باز کرده است.
 */
export function getRequestOrigin(req?: Request | null): string | null {
  if (!req) return null;

  const proto =
    firstHeaderValue(req.headers?.['x-forwarded-proto']) ||
    req.protocol ||
    'http';

  const host =
    firstHeaderValue(req.headers?.['x-forwarded-host']) ||
    firstHeaderValue(req.headers?.host) ||
    (typeof req.get === 'function' ? req.get('host') : null);

  if (!host) return null;

  return normalizeOrigin(`${proto}://${host}`);
}
