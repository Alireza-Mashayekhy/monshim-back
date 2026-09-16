import { QueryClient } from '@tanstack/react-query';

/**
 * ساخت QueryClient با تنظیمات یکسان در سرور و مرورگر.
 * در سرور برای hydrate کردن اطلاعات اولیه (مثل کاربر جاری) استفاده می‌شود.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // با SSR می‌خواهیم داده تا چند لحظه تازه بماند و بلافاصله دوباره درخواست نرود
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
