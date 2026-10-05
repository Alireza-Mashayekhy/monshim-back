import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cookies } from 'next/headers';

import { authKeys } from '@/lib/auth';
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
    // No access token at all: if there's also no refresh token, this is
    // definitively a logged-out guest — no need to ask the API to confirm it.
    const hasRefreshToken = cookieStore.has('refresh_token');
    return { user: null, known: !hasRefreshToken };
  }
  try {
    return { user: extractUser(await getMe()), known: true };
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
