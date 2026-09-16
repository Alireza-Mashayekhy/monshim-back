'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  canAccessPath,
  isPublicAuthPath,
  SESSION_EXPIRED_EVENT,
} from '@/lib/auth';
import { isBarber } from '@/lib/roles';
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
  const { data, isPending, isError, error, refetch, isFetching } = useMe();
  const user = data?.data ?? null;
  const isPublic = isPublicAuthPath(pathname);
  const denied = user && !canAccessPath(pathname, user);
  const destination =
    !isPending && !isFetching && !isError
      ? !user && !isPublic
        ? '/'
        : denied
          ? '/home'
          : user && pathname === '/'
            ? '/home'
            : user && isBarber(user) && pathname === '/barbaer-signup'
              ? '/dashboard/profile'
              : null
      : null;

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);
  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  useEffect(() => {
    const expire = () => {
      clearSessionCache(queryClient);
      useAuthStore.getState().clearUser();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, [queryClient]);

  if (destination || (!isPublic && (isPending || (!user && isFetching)))) {
    return;
  }
  if (!isPublic && isError) {
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
  if (!isPublic && (!user || denied)) return null;

  return children;
}
