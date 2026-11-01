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
import { resolveSessionGate, shouldCheckSession } from '@/lib/session-policy';
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
  const isPublicPath = isPublicAuthPath(pathname);
  const isAuthPage = isAuthPagePath(pathname);
  const checkSession = shouldCheckSession(isPublicPath, isAuthPage);
  const { data, isPending, isError, error, refetch, isFetching } = useMe({
    enabled: checkSession,
  });
  const user = data?.data ?? null;
  const gate = resolveSessionGate({
    isPublicPath,
    isAuthPage,
    isPending,
    isFetching,
    isError,
    hasUser: !!user,
    denied: !!user && !canAccessPath(pathname, user),
  });

  useEffect(() => {
    // During a refresh or a temporary error, an empty cache is not evidence
    // that the user logged out.
    if (!checkSession || gate === 'checking' || gate === 'error') return;
    setUser(user);
  }, [checkSession, gate, setUser, user]);

  useEffect(() => {
    if (gate === 'login') {
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(buildAuthHref('/login', currentUrl));
    } else if (gate === 'role-redirect') {
      router.replace(getRoleLandingPath(user));
    } else if (gate === 'auth-redirect') {
      const callbackUrl = new URLSearchParams(window.location.search).get(
        'callbackUrl',
      );
      router.replace(getAuthDestination(callbackUrl, getRoleLandingPath(user)));
    }
  }, [gate, pathname, router, user]);

  useEffect(() => {
    const expire = () => {
      void clearSessionCache(queryClient);
      useAuthStore.getState().clearUser();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, [queryClient]);

  if (gate === 'error') {
    return (
      <div role="alert" className="p-8 text-center space-y-4">
        <p>
          {getApiErrorMessage(error, 'بررسی نشست انجام نشد. دوباره تلاش کنید.')}
        </p>
        <Button onClick={() => void refetch()} disabled={isFetching}>
          تلاش مجدد
        </Button>
        <Button variant="outline" onClick={() => router.replace('/')}>
          صفحه اصلی
        </Button>
      </div>
    );
  }

  if (gate !== 'ready') {
    return (
      <div role="status" aria-live="polite" className="p-8 text-center">
        در حال بررسی نشست...
      </div>
    );
  }

  return children;
}
