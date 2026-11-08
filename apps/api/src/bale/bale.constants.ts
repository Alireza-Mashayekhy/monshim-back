export const DEFAULT_BALE_API_BASE_URL = 'https://tapi.bale.ai';

/** فاصلهٔ پیش‌فرض بین هر فراخوانی getUpdates در حالت polling (میلی‌ثانیه) */
export const DEFAULT_BALE_POLL_INTERVAL_MS = 3_000;

/** سقف زمان انتظار پاسخ HTTP از سرور بله */
export const BALE_HTTP_TIMEOUT_MS = 15_000;

/** سقف ایمن طول پیام متنی بله (محدودیت API برابر ۴۰۹۶ کاراکتر است) */
export const BALE_MAX_MESSAGE_LENGTH = 4_000;

export type BaleReportPeriod =
  | 'daily'
  | 'yesterday'
  | 'weekly'
  | 'last_week'
  | 'monthly'
  | 'last_month'
  | 'yearly'
  | 'last_year';

export const BALE_REPORT_PERIODS: readonly BaleReportPeriod[] = [
  'daily',
  'yesterday',
  'weekly',
  'last_week',
  'monthly',
  'last_month',
  'yearly',
  'last_year',
] as const;

export const BALE_BUTTONS = {
  DAILY_REPORT: '📊 گزارش روزانه',
  WEEKLY_REPORT: '📅 گزارش هفتگی',
  MONTHLY_REPORT: '🗓 گزارش ماهانه',
  YEARLY_REPORT: '📈 گزارش سالانه',
  PENDING_WITHDRAWALS: '🏦 صف برداشت‌ها',
  HELP: 'ℹ️ راهنما',
} as const;

export const BALE_CALLBACK_PREFIX = {
  REPORT: 'rep:',
  WITHDRAWALS: 'act:withdrawals',
} as const;
