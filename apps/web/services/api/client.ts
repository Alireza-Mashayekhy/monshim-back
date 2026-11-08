import axios, { type InternalAxiosRequestConfig } from 'axios';

import { SESSION_EXPIRED_EVENT } from '@/lib/auth';

import {
  getSessionVersion,
  isCurrentSessionVersion,
  SessionChangedError,
  SessionVerificationError,
  withSessionMutation,
} from './session-coordination';
import {
  createSessionRefresher,
  resolveUnauthorizedOutcome,
} from './session-refresh';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
});

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionVersion?: string;
}

const noRefreshPaths = new Set([
  '/auth/login',
  '/auth/login-with-password',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/sign-up',
  '/auth/register-barber',
  '/auth/refresh',
  '/auth/logout',
]);

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

const REFRESH_TIMEOUT_MS = 10_000;

/** One refresh per tab; cookie-writing requests are also serialized across tabs. */
const sessionRefresher = createSessionRefresher(
  () => {
    const version = getSessionVersion();
    return withSessionMutation(() => {
      // A queued refresh must not run after another tab logged in or out.
      if (version !== getSessionVersion()) throw new SessionChangedError();
      return api.post('/auth/refresh', undefined, {
        timeout: REFRESH_TIMEOUT_MS,
      });
    });
  },
  {
    onExpired: error => {
      const config = axios.isAxiosError(error)
        ? (error.config as AuthRequestConfig | undefined)
        : undefined;
      // A late 401 belonging to an older account must not clear the new one.
      if (
        config?._sessionVersion === undefined ||
        config._sessionVersion === getSessionVersion()
      ) {
        notifySessionExpired();
      }
    },
    onUnrecoverable: () => {
      // Network, rate-limit and server errors leave the session untouched.
    },
  },
);

export async function refreshSessionRequest(): Promise<void> {
  const version = getSessionVersion();
  const result = await sessionRefresher.refresh();
  if (version !== getSessionVersion()) throw new SessionChangedError();
  if (!result.ok) throw result.error ?? new Error('session refresh failed');
}

api.interceptors.request.use(config => {
  const request = config as AuthRequestConfig;
  const version = getSessionVersion();
  // Never replay a request made for a previous account under a new account.
  if (request._retry && request._sessionVersion !== version) {
    throw new SessionChangedError();
  }
  request._sessionVersion ??= version;
  return request;
});

api.interceptors.response.use(
  response => {
    const request = response.config as AuthRequestConfig;
    if (!isCurrentSessionVersion(request._sessionVersion)) {
      throw new SessionChangedError();
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as AuthRequestConfig | undefined;
    if (!isCurrentSessionVersion(original?._sessionVersion)) {
      return Promise.reject(new SessionChangedError());
    }
    const path = original?.url?.split('?')[0].replace(/\/+$/, '');
    if (
      !original ||
      error.response?.status !== 401 ||
      noRefreshPaths.has(path || '')
    ) {
      return Promise.reject(error);
    }
    if (original._sessionVersion !== getSessionVersion()) {
      return Promise.reject(new SessionChangedError());
    }
    if (original._retry) {
      // A 401 from an individual endpoint after a successful refresh does not
      // prove the refresh token expired (e.g. a proxy/cookie configuration
      // issue). Do not turn it into a logout or a cached anonymous /me result.
      return Promise.reject(new SessionVerificationError());
    }
    original._retry = true;

    const result = await sessionRefresher.refresh();
    if (original._sessionVersion !== getSessionVersion()) {
      return Promise.reject(new SessionChangedError());
    }
    const outcome = resolveUnauthorizedOutcome(result, error);
    return outcome.type === 'retry'
      ? api(original)
      : Promise.reject(outcome.error);
  },
);
