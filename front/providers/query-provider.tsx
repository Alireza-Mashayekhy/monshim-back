'use client';

import {
  type DehydratedState,
  environmentManager,
  HydrationBoundary,
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { DirectionProvider } from '@/components/ui/direction';
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
 * Provider اختصاصی react-query + DirectionProvider.
 *
 * این Provider **فقط** در لایوت‌های `(user)` / `(auth)` / `(dashboard)` /
 * `(admin)` mount می‌شود؛ یعنی صفحات مارکتینگ (`(marketing)`) که از
 * react-query استفاده نمی‌کنند، دیگر ~۱۴.۴K gz از `@tanstack/react-query`
 * را در باندل اولیهٔ خود ندارند.
 *
 * NOTE: `useState` برای ساخت QueryClient استفاده نشده تا در رندر اولیه
 * اگر خطایی پیش بیاید، React کلاینت را دور نیندازد (الگوی رسمی react-query).
 */
export default function QueryProvider({
  children,
  dehydratedState,
}: {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <DirectionProvider dir="rtl">{children}</DirectionProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
