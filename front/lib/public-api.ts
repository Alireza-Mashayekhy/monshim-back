import { resolveServerApiBaseUrl } from './api-base-url';
import { publicImageUrl } from './images';

type ApiEnvelope<T> = {
  data?: T;
  pagination?: unknown;
  status?: number;
  message?: string;
};

let loggedMissingBaseUrl = false;

/**
 * Fetch data that is intentionally public from the backend during SSR.
 * The base URL is resolved by `resolveServerApiBaseUrl()` (server-only
 * `API_URL` first, then the public API URL — relative values like `/api`
 * are resolved against the site origin in production).
 *
 * ⚠️ برگرداندن `null` از اینجا برای صفحه‌هایی مثل `/panel/barber/[id]`
 * یعنی اجرای `notFound()` و نمایش ۴۰۴ به کاربر. پس هر سه حالت خطا
 * (کانفیگ نامعتبر، پاسخ غیرموفق بک‌اند، خطای شبکه) لاگ می‌شوند؛ قبلاً
 * این خطاها بی‌صدا بلعیده می‌شدند و ۴۰۴ کاذبِ ناشی از کانفیگ سرور از
 * «آرایشگاه واقعاً وجود ندارد» قابل تشخیص نبود.
 */
export async function fetchPublicApi<T>(path: string): Promise<T | null> {
  const baseUrl = resolveServerApiBaseUrl();
  if (!baseUrl) {
    if (!loggedMissingBaseUrl) {
      loggedMissingBaseUrl = true;
      console.error(
        '[public-api] آدرس پایهٔ API سمت سرور تنظیم نشده یا نامعتبر است ' +
          '(API_URL / NEXT_PUBLIC_API_URL)؛ همهٔ fetchهای SSR عمومی null ' +
          'برمی‌گردانند و صفحه‌های وابسته ۴۰۴ می‌شوند.',
      );
    }
    return null;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`[public-api] ${url} -> HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const envelope = payload as ApiEnvelope<T>;
      const data = envelope.data ?? null;

      if (
        data !== null &&
        envelope.pagination !== undefined &&
        (Array.isArray(data) || typeof data === 'object')
      ) {
        return {
          ...(Array.isArray(data) ? {} : data),
          ...(Array.isArray(data) ? { data } : {}),
          status: envelope.status ?? 200,
          message: envelope.message ?? 'success',
          pagination: envelope.pagination,
        } as T;
      }

      return data;
    }

    return payload as T;
  } catch (error) {
    console.error(`[public-api] خطا در اتصال به ${url}:`, error);
    return null;
  }
}

export function absolutePublicImageUrl(imagePath?: string | null) {
  return publicImageUrl(imagePath);
}
