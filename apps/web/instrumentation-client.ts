import {
  captureRouterTransitionStart,
  scheduleSentryLoading,
} from '@/lib/sentry-client';

/**
 * نقطهٔ ورود instrumentation سمت کلاینت.
 *
 * این فایل در entryِ کلاینتِ همهٔ صفحه‌ها import می‌شود، بنابراین باید تا حد ممکن
 * سبک بماند؛ به همین دلیل بارگذاری SDK سنگین Sentry را به `lib/sentry-client`
 * واگذار می‌کنیم که آن را در زمان idle و به‌صورت chunk مجزا لود می‌کند.
 */
if (typeof window !== 'undefined') {
  scheduleSentryLoading();
}

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  captureRouterTransitionStart(url, navigationType);
}
