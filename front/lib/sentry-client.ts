'use client';

import type * as SentryType from '@sentry/nextjs';

/**
 * لایهٔ نازکِ دسترسی به Sentry در سمت کلاینت.
 *
 * پکیج کلاینت Sentry بیش از ۱۴۰ کیلوبایت (gzip) حجم دارد و شامل polyfillهای
 * قدیمی (Array.at، flat، flatMap، Object.fromEntries، Object.hasOwn،
 * trimStart/trimEnd و ...) است. تا قبل از این تغییر، چون
 * `instrumentation-client.ts` و `app/global-error.tsx` آن را به‌صورت مستقیم
 * import می‌کردند، این باندل در مسیر criticalِ همهٔ صفحه‌ها قرار می‌گرفت و مستقیماً
 * روی LCP، «Legacy JavaScript» و تعداد requestهای اولیه اثر منفی داشت.
 *
 * این ماژول فقط یک loader دارد، بنابراین خود SDK هیچ‌وقت در باندل اولیه نمی‌آید؛
 * در زمان idle بارگذاری می‌شود و خطاهای بعد از آن (و همهٔ navigationهای بعدی)
 * به‌طور عادی گزارش می‌شوند.
 */

type SentryModule = typeof SentryType;

let sentryPromise: Promise<SentryModule> | null = null;
let sentryModule: SentryModule | null = null;

export function loadSentry(): Promise<SentryModule> {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/nextjs').then(mod => {
      mod.init({
        dsn: 'https://9168378fb23522e9bc24ee4a076c2017@o4510550604120064.ingest.de.sentry.io/4510550606217296',

        // Capture 100% in dev, 10% in production
        // Adjust based on your traffic volume
        tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
      });

      sentryModule = mod;
      return mod;
    });
  }

  return sentryPromise;
}

/** خطا را گزارش می‌کند؛ اگر SDK هنوز لود نشده باشد، ابتدا آن را لود می‌کند. */
export function captureException(error: unknown) {
  void loadSentry()
    .then(mod => {
      mod.captureException(error);
    })
    .catch(() => {
      // خطای بارگذاری/ارسال مانیتورینگ نباید روی تجربهٔ کاربر اثر بگذارد
    });
}

/**
 * Next.js این تابع را در شروع هر navigation صدا می‌زند. تا قبل از آماده شدن
 * Sentry کاری انجام نمی‌دهیم (navigationهای بعدی به‌طور عادی گزارش می‌شوند).
 */
export function captureRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  if (!sentryModule) return;
  sentryModule.captureRouterTransitionStart(url, navigationType);
}

/**
 * SDK را بعد از اینکه مرورگر کارهای critical را انجام داد بارگذاری می‌کند.
 * `requestIdleCallback` (با fallback به setTimeout) تضمین می‌کند که این کار با
 * رندر شدن محتوای اصلی صفحه رقابت نکند.
 */
export function scheduleSentryLoading() {
  const startLoading = () => {
    void loadSentry().catch(() => {
      // ignore
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startLoading, { timeout: 3000 });
  } else {
    setTimeout(startLoading, 1000);
  }
}
