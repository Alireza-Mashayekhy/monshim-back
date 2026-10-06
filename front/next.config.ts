import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

/**
 * فایل‌های استاتیک داخل `public/` (تصاویرOG، تصاویر landing، لوگو، favicon و ...)
 * نامِ هش‌شده ندارند، بنابراین `immutable` برای آن‌ها امن نیست؛ با این حال مقدار
 * پیش‌فرضِ Next (`max-age=0`) باعث می‌شد این منابع در هر بار بازدیدِ هر کاربر
 * دوباره دانلود شوند. یک TTL یک‌ساله به همراه `stale-while-revalidate` تعادل
 * مناسبی بین تازگی و کش‌پذیری ایجاد می‌کند.
 */
const LONG_LIVED_STATIC_ASSETS =
  'public, max-age=31536000, stale-while-revalidate=86400';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // فشرده‌سازی gzip سمت سرور Next (Brotli باید در لبه/CDN فعال باشد)
  compress: true,

  // حذف هدر اضافی از پاسخ‌ها
  poweredByHeader: false,

  /**
   * ⚠️ مسیرهای زیر فقط پوشه‌های asset هستند و هیچ route/pageای با آن‌ها هم‌نام
   * نیست؛ هرگز نباید `headers()` را روی مسیرهایی که page دارند (مثل `/home`)
   * اعمال کرد، چون پاسخ HTML در CDN/مرورگر کاربر کش می‌شود.
   */
  async headers() {
    return [
      /**
       * هدرهای امنیتی برای همهٔ پاسخ‌ها.
       *
       * ⚠️ نکتهٔ مهم: قانونِ زیر فقط هدرهای امنیتی اضافه می‌کند و هیچ
       * `Cache-Control`ای ست نمی‌کند؛ بنابراین هشدارِ بالای این تابع (کش‌شدن
       * HTML مسیرهایی که page دارند) اینجا مصداق ندارد.
       *
       * چرا این‌ها و نه بیشتر؟ ممیزی‌های PageSpeed پنج مورد را چک می‌کنند:
       *   • HSTS  → اضافه شد (بدونِ includeSubDomains، تا ساب‌دامین‌های
       *             بدون HTTPS قفل نشوند).
       *   • X-Frame-Options → اضافه شد (هیچ‌جا خودِ سایت را iframe نمی‌کند).
       *   • Cross-Origin-Opener-Policy → `same-origin-allow-popups` (نه
       *     `same-origin`) تا اگر روزی ورود/پرداخت با پنجرهٔ popup انجام شد،
       *     `window.opener` قطع نشود.
       *   • CSP و Trusted Types → عمداً اضافه نشد: سایت به `<style>` بحرانیِ
       *     درون‌ریزی‌شده، `onload="this.media='all'"` روی لینک CSS، اسکریپت‌های
       *     inline خود Next و تونل Sentry تکیه دارد؛ CSP بدون nonce/hash کل
       *     این‌ها را می‌شکند. (COEP هم عمداً نیست چون منابع cross-origin مثل
       *     Clarity را بلاک می‌کند.)
       */
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/landing/:file*',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
      {
        source: '/logo/:file*',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
      {
        source: '/footer/:file*',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
      {
        source: '/home/banner.jpg',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
      {
        source: '/placeholder.webp',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: LONG_LIVED_STATIC_ASSETS }],
      },
    ];
  },

  images: {
    // تصاویر بهینه‌شدهٔ next/image به‌طور پیش‌فرض تنها ۶۰ ثانیه کش می‌شوند؛
    // این مقدار آن را به ۷ روز می‌رساند (برای تصاویری که عملاً تغییر نمی‌کنند).
    //
    // نکته: این مقدار بر حسب ثانیه است اما Next آن را به `setTimeout(ms)` می‌دهد؛
    // مقادیر خیلی بزرگ (>‎ 2147483 ثانیه) از محدودهٔ int32 بیرون می‌زنند و به
    // `TimeoutOverflowWarning` و در نهایت انقضای فوریِ کش منجر می‌شوند.
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '', // پورت 80
        pathname: '/uploads/**',
      },
      // در صورت نیاز به سایر دامنه‌ها (مثل محیط production)
      {
        protocol: 'https',
        hostname: 'your-production-domain.com',
        pathname: '/uploads/**',
      },
    ],
  },

  experimental: {
    /**
     * `inlineCss` روی این پروژه امتحان شد اما نتیجه معکوس داد: استایل هم در
     * `<style>` و هم در RSC payload (به‌ازای هر segment) تکرار می‌شود و حجم
     * HTMLِ صفحهٔ اصلی از ~۲۶ کیلوبایت به ~۱۱۰ کیلوبایت (gzip) می‌رسد؛ یعنی
     * حدود ۸۴ کیلوبایت اضافه در مسیر critical که بیشتر از یک round-trip
     * صرفه‌جویی‌شده هزینه دارد. بنابراین فایل CSS خارجی (قابل کش) نگه داشته
     * شده است و به‌جای آن، درون‌ریزیِ «CSS بحرانی» بعد از build و روی
     * HTMLهای پررندر‌شده انجام می‌شود: `scripts/inline-critical-css.mjs`.
     */
    inlineCss: false,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'monshiim',

  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the docs: https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
