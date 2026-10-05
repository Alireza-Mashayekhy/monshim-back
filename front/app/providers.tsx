'use client';

import {
  environmentManager,
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { DirectionProvider } from '@/components/ui/direction';
import { useViewportVars } from '@/hooks/use-viewport-vars';
import { makeQueryClient } from '@/lib/query-client';

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

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

export default function Providers({
  children,
  dehydratedState,
}: {
  children: React.ReactNode;
  /** اطلاعات اولیه‌ی گرفته‌شده در سرور (برای مثال کاربر جاری) */
  dehydratedState?: DehydratedState;
}) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  useViewportVars();

  return (
    <>
      <NextTopLoader color="#2299DD" showSpinner={false} />
      <PWAModal />
      <Toaster theme="light" richColors position="top-right" />

      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <DirectionProvider dir="rtl">{children}</DirectionProvider>
        </HydrationBoundary>
      </QueryClientProvider>
    </>
  );
}
