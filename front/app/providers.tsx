'use client';

import dynamic from 'next/dynamic';

import PWAInstallManager from '@/components/pwa/pwa-install-manager';
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
 * مدیر سبک PWA و Toaster/NextTopLoader در اینجا قرار دارند.
 */
const browserQueryClient: undefined | unknown = undefined;

function getQueryClient() {
  // صرفاً برای سازگاری با نوع؛ نگه‌داشتن ارجاع یکتا در کلاینت.
  return browserQueryClient;
}

void getQueryClient;

/**
 * این سه کامپوننت فقط برای تعامل‌های بعد از لود شدن صفحه لازم‌اند (نوار
 * پیشرفت navigation و نوتیفیکیشن toast). رابط مودال PWA هم فقط هنگام نیاز
 * بارگذاری می‌شود، اما شنود رویداد نصب باید زودتر شروع شود. با بارگذاری تنبل حدود ۶۰ کیلوبایت JavaScriptِ مربوط به
 * sonner / next-themes / Radix Dialog و چند request از مسیر criticalِ اولیهٔ
 * همهٔ صفحه‌ها حذف می‌شود.
 */
const NextTopLoader = dynamic(
  () => import('nextjs-toploader').then(mod => mod.default),
  { ssr: false },
);

const Toaster = dynamic(
  () => import('@/components/ui/sonner').then(mod => mod.Toaster),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  useViewportVars();

  return (
    <>
      <NextTopLoader color="#2299DD" showSpinner={false} />
      <PWAInstallManager />
      <Toaster theme="light" richColors position="top-right" />

      {children}
    </>
  );
}
