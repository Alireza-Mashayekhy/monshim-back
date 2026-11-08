import localFont from 'next/font/local';

/**
 * فونت اصلی سایت (وزیرمتن).
 *
 * از نسخهٔ variable فونت (`Vazirmatn[wght].woff2`) استفاده می‌شود تا به‌جای ۹ فایل
 * مجزا برای ۹ وزن (حدود ۴۵۰ کیلوبایت که همگی با `rel=preload` در header درخواست
 * می‌شدند) تنها یک فایل ~۱۱۱ کیلوبایتی لود شود؛ وزن‌های ۱۰۰ تا ۹۰۰ همچنان دقیقاً
 * مثل قبل در دسترس‌اند و هیچ تغییری در ظاهر متن‌ها ایجاد نمی‌شود.
 *
 * این کار سه مشکل PageSpeed را همزمان حل می‌کند:
 * - حجم منابع critical و تعداد requestهای اولیه (۹ فایل → ۱ فایل)
 * - کوتاه شدن Critical Request Chain
 * - کاهش زمان render شدن متن Hero (کاندیدای اصلی LCP)
 *
 * `display: 'swap'` نگه داشته شده تا متن منتظر فونت نماند.
 *
 * نکتهٔ مهم دربارهٔ CLS: `adjustFontFallback` (پیش‌فرض) فقط یک @font-face با
 * `src: local(Arial)` می‌سازد. مقادیر متریک آن face درست است (ascent 101.52%،
 * descent 53.18%، line-gap 0%، size-adjust 101% برای همین فایل فونت)، اما Arial
 * روی اندروید/لینوکس موجود نیست؛ پس آن face کلاً رد می‌شود و مرورگر با فونت
 * پیش‌فرض سیستم رندر می‌کند و بعد از لود وزیرمتن، ارتفاع خط‌ها می‌پرد
 * (سهم بزرگی از CLS). برای همین یک fallback متریک‌تنظیم‌شدهٔ معادل با همان
 * اعداد، ولی با فونت‌های «واقعاً موجود» در `app/globals.css` تعریف شده است.
 */
export const iranSans = localFont({
  src: [
    {
      path: './vazirmatn/Vazirmatn-VF.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: true,
  /**
   * به‌جای `className` (که خانوادهٔ فونت را به `iranSans, "iranSans Fallback"`
   * محدود می‌کند و هیچ generic family‌ای ندارد) از `variable` استفاده می‌کنیم و
   * زنجیرهٔ کامل فونت را در `app/globals.css` می‌سازیم؛ جزئیات و دلیلش (CLS)
   * همان‌جا توضیح داده شده است.
   */
  variable: '--font-iran-sans',
});
