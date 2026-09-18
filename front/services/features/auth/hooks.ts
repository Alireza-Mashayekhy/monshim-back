import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorStatus } from '@/lib/api-error';
import { authKeys } from '@/lib/auth';
import { isAdmin, isBarber, rolesOf } from '@/lib/roles';
import { clearSessionCache } from '@/lib/session-cache';
import { useAuthStore } from '@/store/auth.store';

import {
  fetchMe,
  login,
  loginWithPassword,
  logout,
  refreshSession,
  registerBarber,
  sendOtp,
  signUp,
  verifyOtp,
} from './api';

export { authKeys } from '@/lib/auth';

/**
 * تنها منبع حقیقی اطلاعات کاربر در سمت کلاینت.
 * بعد از لاگین/ثبت‌نام/تغییر نقش، کش آن باطل می‌شود تا همه‌جا به‌روزرسانی شود.
 */
export const useMe = () =>
  useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (count, error) =>
      count < 1 && ![400, 401, 403, 429].includes(getErrorStatus(error) ?? 0),
  });

export function useCurrentUser() {
  const { data, isLoading, isFetching, isError, refetch } = useMe();
  const user = data?.data ?? null;
  return {
    user,
    roles: rolesOf(user),
    isBarber: isBarber(user),
    isAdmin: isAdmin(user),
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}

function useSyncSession() {
  const queryClient = useQueryClient();
  return async () => {
    // Cancel old-account reads before clearing them; late responses must not
    // overwrite the new session. Never make a successful OTP mutation appear to
    // fail just because the subsequent /me request had a network error.
    clearSessionCache(queryClient);
    useAuthStore.getState().clearUser();
    await queryClient
      .fetchQuery({
        queryKey: authKeys.me,
        queryFn: ({ signal }) => fetchMe(signal),
        retry: false,
        staleTime: 0,
      })
      .catch(() => undefined);
  };
}

export function useLogin() {
  const sync = useSyncSession();
  return useMutation({ mutationFn: login, onSuccess: sync });
}

export function useLoginWithPassword() {
  const sync = useSyncSession();
  return useMutation({ mutationFn: loginWithPassword, onSuccess: sync });
}

export function useSendOtp() {
  return useMutation({ mutationFn: sendOtp });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: verifyOtp });
}

export function useSignUp() {
  const sync = useSyncSession();
  return useMutation({ mutationFn: signUp, onSuccess: sync });
}

export function useRegisterBarber() {
  const sync = useSyncSession();
  return useMutation({
    mutationFn: registerBarber,
    onSuccess: async () => {
      // Explicit role transition, not a blanket refresh on every 403.
      await refreshSession().catch(() => undefined);
      await sync();
    },
  });
}

/** دریافت توکن تازه — برای وقتی که نقش کاربر در سرور تغییر کرده است */
export function useRefreshSession() {
  const sync = useSyncSession();
  return useMutation({ mutationFn: refreshSession, onSuccess: sync });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      clearSessionCache(queryClient);
      useAuthStore.getState().clearUser();
    },
  });
}
