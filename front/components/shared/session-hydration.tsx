import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cookies, headers } from 'next/headers';

import { authKeys } from '@/lib/auth';
import { apiMayUseDifferentCookieHost } from '@/lib/auth-cookie-origin';
import { makeQueryClient } from '@/lib/query-client';
import { extractUser } from '@/lib/roles';
import { getMe } from '@/services/features/auth/server.api';
import { UserResponse } from '@/services/features/auth/types';

/**
 * فقط داده‌های معتبر API هیدرات می‌شوند؛ هیچ‌وقت از هدرهای درخواست استفاده نمی‌کنیم.
 */
async function resolveUser(): Promise<{
  user: UserResponse | null;
  known: boolean;
}> {
  const cookieStore = await cookies();
  if (!cookieStore.has('access_token')) {
    const hasRefreshToken = cookieStore.has('refresh_token');
    const apiHasDifferentHost = apiMayUseDifferentCookieHost(
      process.env.NEXT_PUBLIC_API_URL,
      (await headers()).get('host'),
    );
    // A refresh cookie, or cookies owned by another API host, can only be
    // checked in the browser. Do not hydrate either case as a known guest.
    return { user: null, known: !hasRefreshToken && !apiHasDifferentHost };
  }
  try {
    const user = extractUser(await getMe());
    return { user, known: !!user };
  } catch {
    return { user: null, known: false };
  }
}

function buildDehydratedState(user: UserResponse | null, known: boolean) {
  const queryClient = makeQueryClient();

  if (known) {
    queryClient.setQueryData(authKeys.me, {
      status: user ? 200 : 401,
      message: '',
      data: user,
    });
  }

  return dehydrate(queryClient);
}

/**
 * اطلاعات کاربر را سمت سرور می‌گیریم و در کش react-query هیدرات می‌کنیم تا
 * اولین رندر مرورگر (در پنل‌ها و صفحاتی که به وضعیت کاربر وابسته‌اند) بدون
 * پرش/خالی ماندن منوها انجام شود.
 *
 * چرا داخل layoutهای گروه‌های خصوصی و نه layout ریشه؟
 * چون خواندن کوکی در layout ریشه کل سایت را Dynamic می‌کرد (حتی صفحات
 * بازاریابی/عمومی مثل «/») و برای هر بازدید یک درخواست به `/auth/me`
 * می‌فرستاد؛ نتیجه‌اش TTFB بالا و نبود امکان prerender برای صفحات عمومی بود.
 * حالا هر گروهی که واقعاً به نشست نیاز دارد، هیدریشن خودش را دارد.
 *
 * ترتیب مهم است: `SessionHydration` باید **بالاتر** از `AuthProvider`
 * رندر شود. در غیر این صورت اولین رندر `useMe()` بدون داده انجام می‌شود و
 * react-query فوراً یک درخواست `/auth/me` اضافه می‌فرستد (یک رفت‌وبرگشت
 * شبکه تکراری در مسیر بحرانی).
 */
export default async function SessionHydration({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, known } = await resolveUser();

  return (
    <HydrationBoundary state={buildDehydratedState(user, known)}>
      {children}
    </HydrationBoundary>
  );
}
