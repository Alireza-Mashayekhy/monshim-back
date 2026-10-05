import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

/**
 * کش مرورگری برای فایل‌های استاتیک «بدون هش» داخل `public/`.
 *
 * Next.js به‌صورت پیش‌فرض برای این فایل‌ها `Cache-Control: public, max-age=0`
 * می‌فرستد؛ یعنی مرورگر هر بار آن‌ها را دوباره اعتبارسنجی می‌کند (Lighthouse:
 * «Use efficient cache lifetimes»). چون این تصاویر به‌ندرت عوض می‌شوند و در
 * مسیر رندر صفحه اصلی هم هستند، ۳۰ روز کش + stale-while-revalidate می‌دهیم.
 * نکته: اگر تصویری با همان نام عوض شد، برای دیدن فوری آن باید فایل را rename
 * کنید (استاندارد رایج cache busting).
 */
const PUBLIC_ASSET_CACHE_CONTROL =
  'public, max-age=2592000, stale-while-revalidate=86400';

/** مسیرهایی که کش بلندمدت می‌گیرند (خارج از /_next که خودش immutable است). */
const PUBLIC_ASSET_PATHS = [
  '/logo/:path*',
  '/landing/:path*',
  '/footer/:path*',
  '/home/:path*',
  '/placeholder.webp',
];

/**
 * فایل‌های متادیتا (`app/favicon.ico` و `app/manifest.ts`) به‌صورت پیش‌فرض با
 * `Cache-Control: public, max-age=0, must-revalidate` سرو می‌شوند؛ یعنی هر
 * بازدید یک اعتبارسنجی کامل. این‌ها مثل تصاویر public کم‌تغییرند، پس کش
 * یک‌هفته‌ای می‌گیرند (کوتاه‌تر از تصاویر، چون در صورت تغییر باید سریع دیده
 * شوند).
 */
const METADATA_ASSET_CACHE_CONTROL =
  'public, max-age=604800, stale-while-revalidate=86400';

const METADATA_ASSET_PATHS = ['/favicon.ico', '/manifest.webmanifest'];

const nextConfig: NextConfig = {
  // فشرده‌سازی gzip سمت سرور Next (Brotli باید در لبه/CDN فعال باشد)
  compress: true,
  turbopack: {
    root: __dirname,
  },
  /**
   * توجه: `experimental.inlineCss` تست شد و رد شد. با CSS فعلی (۱۷۶KB خام)
   * این قابلیت کل استایل را هم داخل `<style>` و هم داخل RSC payload
   * تکرار می‌کند و HTML صفحه اصلی از ۲۵KB gzip به ۱۱۱KB gzip می‌رسید؛
   * یعنی به قیمت حذف یک درخواست، حجم هر بازدید چند برابر می‌شد (و کش
   * بین‌صفحه‌ای CSS هم از دست می‌رفت). در عوض با SSR استاتیک، درخواست CSS
   * از همان origin سریع سرو می‌شود و فایل با `immutable` کش می‌شود.
   */
  async headers() {
    return [
      ...PUBLIC_ASSET_PATHS.map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE_CONTROL }],
      })),
      ...METADATA_ASSET_PATHS.map(source => ({
        source,
        headers: [
          { key: 'Cache-Control', value: METADATA_ASSET_CACHE_CONTROL },
        ],
      })),
    ];
  },
  images: {
    /**
     * کش تصاویر بهینه‌شده‌ی `next/image` (پیش‌فرض Next 16 فقط ۴ ساعت است).
     * ۳۰ روز طول عمر کش می‌دهد تا آدیت «Use efficient cache lifetimes» پاس شود.
     */
    minimumCacheTTL: 2592000,
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
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
