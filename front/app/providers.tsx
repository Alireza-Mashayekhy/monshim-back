'use client';

import {
  type DehydratedState,
  environmentManager,
  HydrationBoundary,
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import NextTopLoader from 'nextjs-toploader';

import PWAModal from '@/components/shared/pwa-modal';
import { DirectionProvider } from '@/components/ui/direction';
import { Toaster } from '@/components/ui/sonner';
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

  return (
    <>
      <NextTopLoader color="#2299DD" showSpinner={false} />
      <PWAModal />
      <Toaster theme="light" richColors position="top-right" />

      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <DirectionProvider dir="rtl">{children}</DirectionProvider>
        </HydrationBoundary>{' '}
      </QueryClientProvider>
    </>
  );
}
