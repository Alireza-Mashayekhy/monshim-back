/**
 * ابزارهای embed ویدیوی آپارات.
 *
 * آپارات سه نوع کد اشتراک‌گذاری می‌دهد (script، AMP و iframe)؛ فقط iframe
 * با SSR و hydration سازگار است، پس در کل پروژه از فرمت iframe استفاده
 * می‌شود:
 * `https://www.aparat.com/video/video/embed/videohash/{hash}/vt/frame`
 */

const APARAT_API_BASE = 'https://www.aparat.com/etc/api/video/videohash';

/** آدرس embed رسمی آپارات برای یک videohash */
export function aparatEmbedUrl(hash: string): string {
  return `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`;
}

/** آدرس صفحهٔ ویدیو در خود آپارات (برای لینک «تماشا در آپارات») */
export function aparatWatchUrl(hash: string): string {
  return `https://www.aparat.com/v/${hash}`;
}

/**
 * videohash را از هر ورودی قابل قبولی بیرون می‌کشد:
 * لینک صفحهٔ ویدیو (`aparat.com/v/xxxx`)، لینک embed یا خودِ hash.
 */
export function extractAparatHash(input: string): string {
  const trimmed = input.trim();
  return (
    trimmed.match(
      /aparat\.com\/(?:v|video\/video\/embed\/videohash)\/([\w-]+)/i,
    )?.[1] ?? trimmed
  );
}

interface AparatVideoApi {
  video?: {
    big_poster?: string;
    small_poster?: string;
  };
}

/**
 * پوستر ویدیو را از API عمومی آپارات می‌گیرد.
 *
 * فقط سمت سرور و با کش یک‌هفته‌ای صدا زده می‌شود؛ اگر آپارات در دسترس نبود
 * یا پاسخ معتبر نداد، null برمی‌گردد تا کامپوننت facade با پوستر جایگزین
 * رندر کند — یعنی خرابی آپارات هرگز رندر صفحه را نمی‌شکند.
 */
export async function fetchAparatPoster(hash: string): Promise<string | null> {
  try {
    const response = await fetch(`${APARAT_API_BASE}/${hash}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AparatVideoApi;
    return data.video?.big_poster ?? data.video?.small_poster ?? null;
  } catch {
    return null;
  }
}
