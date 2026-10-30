/**
 * منطقِ «تازه‌سازی نشست» به‌صورت خالص و بدون وابستگی به اپ.
 *
 * چرا از `client.ts` جدا شده؟
 * ---------------------------
 * چون رفتارِ نشست (اینکه چه خطایی یعنی «نشست تمام شده» و چه خطایی یعنی
 * «سرور موقتاً در دسترس نیست») مهم‌ترین عامل لاگ‌اوت‌های ناخواسته است و باید
 * قابل تست باشد. این فایل هیچ وابستگی به اپ/alias ندارد تا بتوان آن را
 * مستقیماً اجرا و تست کرد.
 */

/** وضعیتِ HTTP از یک خطا؛ `undefined` یعنی خطای بدون پاسخ (شبکه/timeout/abort). */
export function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/**
 * تنها حالت‌هایی که واقعاً یعنی «نشست تمام شده است»:
 *   ۴۰۱ → رفرش‌توکن نامعتبر/منقضی یا ارسال‌نشده
 *   ۴۰۳ → کاربر غیرفعال شده (isActive = false)
 * هر چیز دیگری (۴۲۹، ۴۰۰، ۴۰۴، ۴۰۸، خطای شبکه، صفحهٔ خطای پروکسی/CDN …)
 * معنیِ «خروج از نشست» ندارد و نباید کاربر را لاگ‌اوت کند.
 */
export function isSessionExpiredError(error: unknown): boolean {
  const status = errorStatus(error);
  return status === 401 || status === 403;
}

/**
 * خطاهای گذرا: باید دوباره تلاش شوند و در صورت شکست، نشست «برگشت‌پذیر»
 * بماند (کش/کوکی پاک نشود و رویداد انقضا منتشر نشود).
 */
/**
 * لغوِ خودِ درخواست (AbortSignal). خطای گذرا نیست: کوئری لغوشده نباید با
 * تلاشِ مجدد زنده شود و نباید هم «انقضای نشست» حساب شود.
 */
export function isCanceledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 'ERR_CANCELED' || code === 'ABORT_ERR';
}

export function isTransientAuthError(error: unknown): boolean {
  if (isCanceledError(error)) return false;
  const status = errorStatus(error);
  if (status === undefined) return true; // شبکه، timeout، CORS
  if (status === 408 || status === 425 || status === 429) return true;
  return status >= 500;
}

/** فاصلهٔ تلاش‌های دوباره: ۷۰۰ms برای اختلال لحظه‌ای، ۲s برای قطعی کوتاه. */
export const REFRESH_RETRY_DELAYS_MS: readonly number[] = [700, 2000];

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type PostRefreshFn = (signal?: AbortSignal) => Promise<unknown>;

export interface SessionRefreshResult {
  /** نشست با موفقیت تازه شد. */
  ok: boolean;
  /** `true` یعنی سرور رسماً گفت نشست تمام است (۴۰۱/۴۰۳ روی `/auth/refresh`). */
  expired: boolean;
  /** خطای واقعیِ آخرین تلاش (برای پرتاب/نمایش به کاربر). */
  error?: unknown;
}

export interface SessionRefresherHooks {
  /** نشست واقعاً تمام شده: انتشار رویداد انقضا و پاک‌سازی کش/کوکی. */
  onExpired: () => void;
  /**
   * تلاش‌ها تمام شد ولی نشست «تمام‌شده» اعلام نشد (خطای موقت یا وضعیتِ
   * غیرمنتظره). عمداً هیچ پاک‌سازی‌ای انجام نمی‌دهد تا کاربر با «تلاش
   * دوباره» برگردد، نه با لاگ‌اوت.
   */
  onUnrecoverable: (error: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
}

export interface SessionRefresher {
  refresh(signal?: AbortSignal): Promise<SessionRefreshResult>;
  /** تازه‌سازیِ در جریان (بدون شروعِ یکی جدید)؛ `null` یعنی چیزی در جریان نیست. */
  getInflight(): Promise<SessionRefreshResult> | null;
}

/**
 * ساختِ تازه‌سازِ نشست با دو ویژگی مهم:
 *  ۱. single-flight: درخواست‌های هم‌زمان (چند تب، چند کوئری موازی) فقط **یک**
 *     بار `/auth/refresh` می‌زنند و همه منتظر همان یک نتیجه می‌مانند؛
 *  ۲. تفکیکِ «انقضای نشست» از «خطای موقت» + تلاشِ مجدد با فاصلهٔ فزاینده.
 */
export function createSessionRefresher(
  postRefresh: PostRefreshFn,
  hooks: SessionRefresherHooks,
): SessionRefresher {
  const wait = hooks.sleep ?? sleep;
  let inflight: Promise<SessionRefreshResult> | null = null;

  const attempt = async (
    signal?: AbortSignal,
  ): Promise<SessionRefreshResult> => {
    for (let retryIndex = 0; ; retryIndex++) {
      try {
        await postRefresh(signal);
        return { ok: true, expired: false };
      } catch (error) {
        if (isSessionExpiredError(error)) {
          hooks.onExpired();
          return { ok: false, expired: true, error };
        }

        const canRetry =
          isTransientAuthError(error) &&
          retryIndex < REFRESH_RETRY_DELAYS_MS.length;
        if (!canRetry) {
          hooks.onUnrecoverable(error);
          return { ok: false, expired: false, error };
        }
        await wait(REFRESH_RETRY_DELAYS_MS[retryIndex]);
      }
    }
  };

  return {
    refresh(signal?: AbortSignal): Promise<SessionRefreshResult> {
      if (!inflight) {
        const run = attempt(signal);
        inflight = run;
        run
          .finally(() => {
            if (inflight === run) inflight = null;
          })
          .catch(() => undefined);
      }
      return inflight;
    },
    getInflight: () => inflight,
  };
}

/** نتیجهٔ تصمیم برای یک ۴۰۱ که تازه‌سازی پشتِ آن انجام شده است. */
export type UnauthorizedOutcome =
  { type: 'retry' } | { type: 'reject'; error: unknown };

/**
 * تصمیمِ نهاییِ interceptor برای یک ۴۰۱:
 *  - رفرش موفق → همان درخواستِ اصلی دوباره اجرا شود؛
 *  - انقضای واقعی → ۴۰۱ اصلی برگردانده شود (لاگ‌اوت درست است)؛
 *  - خطای گذرا/نامشخص → **خطای خودِ رفرش** برگردانده شود؛ اگر ۴۰۱ اصلی
 *    برگردانده می‌شد، لایهٔ کوئری آن را «خروج از نشست» می‌دید و کاربر را با
 *    رفرش‌توکنِ معتبر به صفحهٔ ورود می‌فرستاد.
 */
export function resolveUnauthorizedOutcome(
  result: SessionRefreshResult,
  originalError: unknown,
): UnauthorizedOutcome {
  if (result.ok) return { type: 'retry' };
  return {
    type: 'reject',
    error: result.expired ? originalError : (result.error ?? originalError),
  };
}
