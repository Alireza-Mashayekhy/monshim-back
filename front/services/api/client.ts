import axios, { InternalAxiosRequestConfig } from 'axios';

import { SESSION_EXPIRED_EVENT } from '@/lib/auth';

import {
  createSessionRefresher,
  resolveUnauthorizedOutcome,
} from './session-refresh';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
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

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

/** مهلتِ تازه‌سازی: بدون آن، یک پاسخِ معلّق همهٔ درخواست‌ها را قفل می‌کرد. */
const REFRESH_TIMEOUT_MS = 10_000;

/**
 * تازه‌سازی نشست، مشترک بین ۴۰۱های هم‌زمان و فراخوانی‌های صریح.
 *
 * دو تفاوت مهم با نسخهٔ قبلی:
 *  ۱. **فقط** ۴۰۱/۴۰۳ از `/auth/refresh` یعنی «نشست تمام شده». قبلاً هر
 *     پاسخِ زیر ۵۰۰ (مثل ۴۲۹ محدودیت نرخ، ۴۰۰، ۴۰۴ یا صفحهٔ خطای پروکسی)
 *     کاربر را با رفرش‌توکنِ کاملاً معتبر لاگ‌اوت می‌کرد.
 *  ۲. خطاهای گذرا (۴۲۹/۴۰۸/۵xx/قطعی شبکه) با فاصلهٔ زمانی دوباره تلاش
 *     می‌شوند و اگر باز هم نشد، نشست **دست‌نخورده** می‌ماند تا کاربر با یک
 *     «تلاش مجدد» برگردد.
 */
const sessionRefresher = createSessionRefresher(
  /**
   * عمداً `signal` پاس نمی‌دهیم: رفرش یک عملیاتِ **مشترک** است (چند کوئری و چند
   * تب به همان یک درخواست تکیه می‌کنند). اگر با signalِ یکی از فراخوان‌ها لغو
   * شود، بقیهٔ فراخوان‌ها هم بی‌دلیل شکست می‌خورند.
   */
  () => api.post('/auth/refresh', undefined, { timeout: REFRESH_TIMEOUT_MS }),
  {
    onExpired: notifySessionExpired,
    onUnrecoverable: () => {
      // عمداً خالی: هیچ کش/کوکی/رویدادی پاک نمی‌شود (توضیح در session-refresh).
    },
  },
);

/** تازه‌سازی صریح نشست؛ در صورت شکست خطا پرتاب می‌شود (همان قرارداد قبلی). */
export async function refreshSessionRequest(): Promise<void> {
  const result = await sessionRefresher.refresh();
  if (!result.ok) throw result.error ?? new Error('session refresh failed');
}

/**
 * منتظرِ تازه‌سازیِ در جریان می‌ماند (بدون شروعِ یکی جدید) تا لاگین/خروج
 * هم‌زمان با آن، کوکی‌ها را خراب نکند.
 */
export async function waitForSessionRefresh() {
  await sessionRefresher.getInflight()?.catch(() => undefined);
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
      // یک‌بار با توکنِ تازه تلاش کردیم و باز هم ۴۰۱ گرفتیم: نشست واقعاً تمام است.
      notifySessionExpired();
      return Promise.reject(error);
    }
    original._retry = true;

    // تصمیمِ اصلی (چه خطایی یعنی خروج از نشست) در session-refresh تست شده است.
    const outcome = resolveUnauthorizedOutcome(
      await sessionRefresher.refresh(),
      error,
    );
    return outcome.type === 'retry'
      ? api(original)
      : Promise.reject(outcome.error);
  },
);
