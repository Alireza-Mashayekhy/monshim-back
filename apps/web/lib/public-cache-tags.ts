/**
 * تگِ کشِ دادهٔ عمومی (`next: { tags: [...] }`).
 *
 * همهٔ fetchهای SSR عمومی (`fetchPublicApi`) با همین تگ کش می‌شوند تا بتوان
 * با یک فراخوانیِ `updateTag` / `revalidateTag` تمام صفحه‌هایی که از این داده
 * ساخته شده‌اند (پروفایل عمومی، جست‌وجو، صفحهٔ اصلی و sitemap) را یک‌جا تازه
 * کرد. جدا نگه داشتنِ این ثابت در یک فایلِ بدون وابستگی، اجازه می‌دهد هم لایهٔ
 * fetch (`lib/public-api`) و هم لایهٔ invalidation (`lib/public-cache`) آن را
 * بدون کشیدنِ `next/cache` به باندل کلاینت ایمپورت کنند.
 */
export const PUBLIC_API_CACHE_TAG = 'public-api-data';
