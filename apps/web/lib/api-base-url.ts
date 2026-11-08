import { siteConfig } from './site-config';

let warnedAboutRelativeBase = false;

/**
 * آدرس پایهٔ API برای `fetch`های سمت سرور (Server Componentها و sitemap).
 *
 * چرا نمی‌شود مستقیم از `NEXT_PUBLIC_API_URL` استفاده کرد؟ آن متغیر برای
 * مرورگر تنظیم می‌شود و روی سرورِ محصول معمولاً نسبی است (`/api`)؛ مرورگر
 * URL نسبی را می‌فهمد اما `fetch` سمت سرور بدون هاست نمی‌تواند آن را
 * resolve کند. نتیجهٔ نادیده‌گرفتن این تفاوت، یک باگ واقعی بود: صفحهٔ
 * `/panel/provider/[id]` لوکال سالم بود ولی روی سرور ۴۰۴ می‌داد، چون fetch
 * سروری بی‌صدا `null` برمی‌گرداند و صفحه `notFound()` می‌کرد — درحالی‌که
 * بک‌اند و دیتابیس کاملاً سالم بودند.
 *
 * ترتیب اولویت:
 *  ۱) `API_URL` — فقط سمت سرور خوانده می‌شود. روی سرور بهتر است آدرس
 *     «داخلی» بک‌اند باشد (مثلاً `http://127.0.0.1:3000/api`) تا درخواستِ
 *     خودِ سرور مجبور نباشد از دامنهٔ عمومی برگردد (hairpin NAT/فایروال
 *     روی خیلی از VPSها همین‌جا می‌شکند). پسوند `/api` الزامی است چون
 *     بک‌اند Nest پیشوند سراسری `api` دارد (`setGlobalPrefix('api')`).
 *  ۲) `NEXT_PUBLIC_API_URL` اگر مطلق باشد (`https://...`).
 *  ۳) اگر نسبی بود (مثل `/api`) یعنی «روی همین دامنهٔ سایت»؛ در
 *     production روی دامنهٔ اصلی (`siteConfig.url`) resolve می‌شود. در
 *     development عمداً `null` برمی‌گردد تا محیط توسعه بی‌صدا به API
 *     محصول وصل نشود و کانفیگ اشتباه همان‌جا دیده شود.
 */
export function resolveServerApiBaseUrl(): string | null {
  const configured = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!configured) return null;

  const trimmed = configured.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  // آدرس مطلق: همان‌طور که هست قابل استفاده است.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // آدرس نسبی (مثل `/api`): یعنی API روی همین دامنهٔ سایت سرو می‌شود.
  if (trimmed.startsWith('/')) {
    if (process.env.NODE_ENV === 'production') {
      return `${siteConfig.url.replace(/\/+$/, '')}${trimmed}`;
    }

    if (!warnedAboutRelativeBase) {
      warnedAboutRelativeBase = true;
      console.warn(
        `[api] آدرس API ("${configured}") نسبی است و fetch سمت سرور ` +
          'نمی‌تواند از آن استفاده کند؛ در محیط توسعه یک آدرس مطلق بگذار ' +
          '(مثلاً http://localhost:4000/api) یا API_URL را ست کن.',
      );
    }
    return null;
  }

  return null;
}
