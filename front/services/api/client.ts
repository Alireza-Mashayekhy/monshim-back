import axios, { InternalAxiosRequestConfig } from 'axios';

import { SESSION_EXPIRED_EVENT } from '@/lib/auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

const noRefreshPaths = new Set([
  '/auth/login',
  '/auth/login-with-password',
  '/auth/send-otp',
  '/auth/sign-up',
  '/auth/register-barber',
  '/auth/refresh',
  '/auth/logout',
]);

// Shared by explicit refreshes and concurrent 401 responses. Never intercept
// refresh/logout recursively, and never treat a real permission denial as expiry.
let refreshPromise: Promise<void> | null = null;

export function refreshSessionRequest(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function waitForSessionRefresh() {
  await refreshPromise?.catch(() => undefined);
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

api.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const path = original?.url?.split('?')[0].replace(/\/+$/, '');
    if (
      !original ||
      error.response?.status !== 401 ||
      noRefreshPaths.has(path || '')
    ) {
      return Promise.reject(error);
    }
    if (original._retry) {
      notifySessionExpired();
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      await refreshSessionRequest();
    } catch (refreshError) {
      const refreshStatus = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined;
      if (refreshStatus !== undefined && refreshStatus < 500) {
        notifySessionExpired();
        return Promise.reject(error);
      }
      return Promise.reject(refreshError);
    }
    return api(original);
  },
);
