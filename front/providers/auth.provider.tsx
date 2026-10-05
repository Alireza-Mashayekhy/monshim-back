'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  buildAuthHref,
  canAccessPath,
  getAuthDestination,
  getRoleLandingPath,
  isAuthPagePath,
  isPublicAuthPath,
  SESSION_EXPIRED_EVENT,
} from '@/lib/auth';
import { clearSessionCache } from '@/lib/session-cache';
import { useMe } from '@/services/features/auth/hooks';
import { useAuthStore } from '@/store/auth.store';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore(state => state.setUser);
  // صفحات عمومی (مارکتینگ، ورود، ...) به نشست کاربر نیازی ندارند؛ در آن‌ها
  // درخواست /auth/me در زمان بارگذاری صفحه ارسال نمی‌شود.
  const isPublicPath = isPublicAuthPath(pathname);
  const { data, isPending, isError, error, refetch, isFetching } = useMe({
    enabled: !isPublicPath,
  });
  const user = data?.data ?? null;
  const denied = user && !canAccessPath(pathname, user);
  const isAuthPage = isAuthPagePath(pathname);

  const destination =
    !isPending && !isFetching && !isError
      ? !user && !isPublicPath
        ? '/login'
        : denied
          ? getRoleLandingPath(user)
          : user && isAuthPage
            ? getRoleLandingPath(user)
            : null
      : null;

  // روی صفحات عمومی کوئری غیرفعال است و `user` همیشه null است؛ نباید با آن
  // مقدار، کاربرِ لاگین‌کرده را از store پاک کرد (در غیر این صورت هنگام رفتن از
  // صفحهٔ اصلی به پنل، لحظه‌ای خالی دیده می‌شود).
  useEffect(() => {
    if (isPublicPath) return;
    setUser(user);
  }, [user, setUser, isPublicPath]);
  useEffect(() => {
    if (!destination) return;

    let redirectTo = destination;
    if (!user && !isPublicPath) {
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      redirectTo = buildAuthHref('/login', currentUrl);
    } else if (user && isAuthPage) {
      const callbackUrl = new URLSearchParams(window.location.search).get(
        'callbackUrl',
      );
      redirectTo = getAuthDestination(callbackUrl, destination);
    }

    router.replace(redirectTo);
  }, [destination, isAuthPage, isPublicPath, pathname, router, user]);

  useEffect(() => {
    const expire = () => {
      clearSessionCache(queryClient);
      useAuthStore.getState().clearUser();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, [queryClient]);

  if (destination || (!isPublicPath && (isPending || (!user && isFetching)))) {
    return;
  }
  if (!isPublicPath && isError) {
    return (
      <div role="alert" className="p-8 text-center space-y-4">
        <p>
          {getApiErrorMessage(error, 'بررسی نشست انجام نشد. دوباره تلاش کنید.')}
        </p>
        <Button onClick={() => void refetch()} disabled={isFetching}>
          تلاش مجدد
        </Button>
        <Button variant="outline" onClick={() => router.replace('/')}>
          صفحه ورود
        </Button>
      </div>
    );
  }
  if (!isPublicPath && (!user || denied)) return null;

  return children;
}
