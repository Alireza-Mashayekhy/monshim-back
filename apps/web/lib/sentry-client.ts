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

/**
 * پیکربندی Sentry.
 *
 * ── چرا tracing به‌صورت پیش‌فرض خاموش است؟ ──────────────────────────────────
 * در `@sentry/nextjs` نسخهٔ ۱۱ اگر `tracesSampleRate` مقدار داشته باشد،
 * `browserTracingIntegration` به‌صورت خودکار فعال می‌شود. آن integration برای
 * *همهٔ* بازدیدکننده‌ها (نه فقط ۱۰٪ نمونه‌ها) این کارها را انجام می‌دهد:
 *   • مشاهده‌گرهای `web-vitals` و long-task
 *   • instrument کردن `fetch`/`XHR` برای افزودن هدر `sentry-trace`
 *   • ساخت تراکنش‌های pageload/navigation و نگه‌داشتن `idleTimeout`
 * این‌ها مداوم روی رشتهٔ اصلی کار می‌کنند و روی CPU و INP اثر می‌گذارند.
 *
 * رصد خطا (error monitoring) که هدف اصلی ماست هیچ‌کدام از این‌ها را لازم ندارد.
 * پس به‌صورت پیش‌فرض فقط خطاها گزارش می‌شوند و اگر روزی رصد کارایی خواستید،
 * کافی است متغیر محیطی زیر را ست کنید (مثلاً 0.1):
 *   NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
 */
const tracesSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '',
);
const tracingEnabled =
  Number.isFinite(tracesSampleRate) && tracesSampleRate > 0;

export function loadSentry(): Promise<SentryModule> {
  if (!sentryPromise) {
    sentryPromise = import('@sentry/nextjs').then(mod => {
      mod.init({
        dsn: 'https://9168378fb23522e9bc24ee4a076c2017@o4510550604120064.ingest.de.sentry.io/4510550606217296',

        ...(tracingEnabled ? { tracesSampleRate } : {}),
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
 * SDK را بعد از تمام شدن کارهای critical بارگذاری می‌کند.
 *
 * ترتیب: رویداد `load` (یعنی وقتی همهٔ منابع اولیه تمام شده‌اند) → `idle`
 * مرورگر. قبلاً این کار با `requestIdleCallback` بلافاصله و تا حداکثر ۳ ثانیه
 * انجام می‌شد؛ یعنی روی دستگاه‌های ضعیف همان فریم‌هایی که هنوز در حال رندر و
 * hydrate کردن صفحه بودند، با پردازش ۱۴۰ کیلوبایت JS مربوط به Sentry شریک
 * می‌شد. حالا هرگز با بارگذاری اولیه رقابت نمی‌کند. اگر خطایی پیش از این
 * لحظه رخ بدهد، `captureException` خودش SDK را فوراً لود می‌کند.
 */
export function scheduleSentryLoading() {
  const startLoading = () => {
    void loadSentry().catch(() => {
      // ignore
    });
  };

  const scheduleWhenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(startLoading, { timeout: 5000 });
    } else {
      setTimeout(startLoading, 1500);
    }
  };

  if (document.readyState === 'complete') {
    scheduleWhenIdle();
    return;
  }

  window.addEventListener('load', scheduleWhenIdle, { once: true });
}
