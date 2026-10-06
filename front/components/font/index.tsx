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
 * `display: 'swap'` نگه داشته شده تا متن منتظر فونت نماند و `adjustFontFallback`
 * (پیش‌فرض) همچنان متریک‌های fallback را تنظیم می‌کند تا CLS ایجاد نشود.
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
});
