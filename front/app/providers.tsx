'use client';

import dynamic from 'next/dynamic';

import { useViewportVars } from '@/hooks/use-viewport-vars';

/**
 * Providerهای پایه که در همهٔ layoutها لازم‌اند.
 *
 * نکتهٔ مهم: `QueryClientProvider` و `DirectionProvider` اینجا قرار
 * **ندارند**؛ قبلاً این دو اینجا بودند و باعث می‌شدند `@tanstack/react-query`
 * (~۱۴.۴K gz در چانک‌های صفحهٔ اصلی) حتی روی صفحات مارکتینگ که هیچ
 * `useQuery` ندارند لود شود.
 *
 * جابه‌جایی: `QueryClientProvider`/`DirectionProvider` به لایوت‌های
 * `(user)`/`(auth)`/`(dashboard)`/`(admin)` منتقل شدند. در مارکتینگ
 * فقط PWAModal/Toaster/NextTopLoader (که هر سه از قبل lazy هستند) می‌ماند.
 */
let browserQueryClient: undefined | unknown = undefined;

function getQueryClient() {
  // صرفاً برای سازگاری با نوع؛ نگه‌داشتن ارجاع یکتا در کلاینت.
  return browserQueryClient;
}

void getQueryClient;

/**
 * این سه کامپوننت فقط برای تعامل‌های بعد از لود شدن صفحه لازم‌اند (نوار
 * پیشرفت navigation، نوتیفیکیشن toast، و پیشنهاد نصب PWA که خودش ۵ ثانیه تأخیر
 * دارد). با بارگذاری تنبل (و بدون SSR) حدود ۶۰ کیلوبایت JavaScriptِ مربوط به
 * sonner / next-themes / Radix Dialog و چند request از مسیر criticalِ اولیهٔ
 * همهٔ صفحه‌ها حذف می‌شود.
 */
const NextTopLoader = dynamic(
  () => import('nextjs-toploader').then(mod => mod.default),
  { ssr: false },
);

const PWAModal = dynamic(() => import('@/components/shared/pwa-modal'), {
  ssr: false,
});

const Toaster = dynamic(
  () => import('@/components/ui/sonner').then(mod => mod.Toaster),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  useViewportVars();

  return (
    <>
      <NextTopLoader color="#2299DD" showSpinner={false} />
      <PWAModal />
      <Toaster theme="light" richColors position="top-right" />

      {children}
    </>
  );
}
