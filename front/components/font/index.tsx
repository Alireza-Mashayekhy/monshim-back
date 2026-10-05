import localFont from 'next/font/local';

/**
 * فونت Vazirmatn به‌صورت variable font بارگذاری می‌شود (یک فایل، وزن‌های ۱۰۰ تا ۹۰۰).
 *
 * چرا؟ قبلاً ۹ فایل static جداگانه ثبت شده بود و next/font برای هر ۹ وزن یک
 * `<link rel="preload" as="font">` تولید می‌کرد (حدود ۴۶۰ کیلوبایت فونت در
 * مسیر بحرانی). آن ۹ درخواست با CSS/JS و تصویر LCP برای پهنای باند رقابت
 * می‌کردند و متن Hero (وزن 900 = font-black) تا رسیدن فایل خودش با فونت
 * fallback نمایش داده می‌شد (PageSpeed: «Element render delay» و
 * «Critical request chain»).
 *
 * با variable font فقط یک فایل (~۱۱۱KB) preload می‌شود و همه‌ی وزن‌های ۱۰۰..۹۰۰
 * بدون تغییر ظاهری در دسترس‌اند. فایل‌های static قبلی در همین پوشه می‌مانند
 * تا اگر جایی لازم شد، بدون تغییر دیگری قابل استفاده باشند.
 *
 * نکته درباره‌ی نام فایل: نام فایل نباید `[` یا `]` داشته باشد. با نام قبلی
 * (`Vazirmatn[wght].woff2`) لینک preload با URL کدشده (`%5Bwght%5D`) ساخته
 * می‌شد ولی `url()` داخل CSS با براکت خام؛ مرورگر این دو را دو آدرس متفاوت
 * می‌دید، preload هیچ‌وقت با درخواست واقعی فونت تطبیق نمی‌خورد و همان فایل
 * دوبار دانلود می‌شد (هدر رفتن پهنای باند + هشدار «preloaded but not used»).
 *
 * `display: 'optional'` انتخاب آگاهانه است: فونت هیچ‌وقت جای خود را وسط رندر
 * عوض نمی‌کند، پس CLS صفر می‌ماند و متن Hero با اولین پینت ظاهر می‌شود
 * (PageSpeed: «Element render delay»). در اولین بازدیدِ کاربر، اگر فایل در
 * بازه‌ی کوتاه block نرسد، متن با فونت fallback سیستمی نمایش داده می‌شود و
 * از ناوبری بعدی (که فونت در کش است) Vazirmatn اعمال می‌شود. برای اینکه
 * همین بازدید اول هم فارسی و خوانا باشد، fallbackها فونت‌های فارسی‌دار
 * سیستم‌اند (Arial پیش‌فرض هیچ گلیف فارسی ندارد).
 */
export const iranSans = localFont({
  src: [
    {
      path: './vazirmatn/Vazirmatn-VF.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'optional',
  fallback: [
    'Tahoma',
    'Segoe UI',
    'Noto Sans Arabic',
    'Naskh',
    'system-ui',
    'sans-serif',
  ],
});
