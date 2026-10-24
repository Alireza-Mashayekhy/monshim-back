import { TransactionType } from 'src/wallet/entities/transaction.entity';

/**
 * ============================================================================
 * قاعدهٔ مشترک «پول واقعی واردشده از درگاه»
 * ============================================================================
 *
 * پنل ادمین، امور مالی آرایشگر و گزارش‌های ربات بله باید همه یک قاعده را
 * رعایت کنند تا اعدادشان با هم اختلاف پیدا نکند:
 *
 *   ۱) فقط پرداخت‌های با وضعیت `PAID` (پرداخت موفق درگاه) پول واقعی هستند.
 *   ۲) پرداختی که بعداً برگشت خورده است، پول نزد ما نمانده؛ پس کنار گذاشته
 *      می‌شود. تشخیص «برگشت‌خورده» با دو نشانهٔ قابل اتکا انجام می‌شود:
 *        • وجود تراکنش REFUND با `referenceId = payment.id`
 *          (همان رکوردی که در صف بازپرداخت مشتری ساخته می‌شود)
 *        • یا پرچم `refundQueued: true` در `payment.metadata`
 *
 * این فایل فقط ثابت‌ها و سازندهٔ شرط SQL دارد تا در سرویس‌های مختلف، بدون
 * وابستگی به ماژول‌های Nest، قابل استفاده باشد.
 */

/** شرح واریز درآمد رزرو به کیف پول آرایشگر */
export const BOOKING_INCOME_DESCRIPTION_PREFIX = 'درآمد رزرو نوبت';

/** همان شرح، به‌صورت الگوی `LIKE` */
export const BOOKING_INCOME_DESCRIPTION_PATTERN = `${BOOKING_INCOME_DESCRIPTION_PREFIX}%`;

/** نشانهٔ متنیِ پرداختِ برگشت‌خورده در ستون JSON متادیتا */
export const REFUNDED_METADATA_PATTERN = '%"refundQueued":true%';

/**
 * شناسهٔ پرداخت‌هایی که برگشت خورده‌اند.
 *
 * هر جا برای یک پرداخت رکورد بازپرداخت مشتری (REFUND) ساخته می‌شود؛ یعنی
 * لغو رزرو قطعی شده و پول باید برگردد. این زیرکوئری عمداً غیرهم‌بسته
 * (non-correlated) است تا MySQL یک‌بار آن را بسازد، نه یک‌بار برای هر ردیف.
 */
export const REFUNDED_PAYMENT_IDS_SUBQUERY = `(
  SELECT refund_tx.referenceId FROM transactions refund_tx
  WHERE refund_tx.type = :refundTxType
    AND refund_tx.referenceId IS NOT NULL
)`;

/**
 * شرط «این پرداخت برگشت نخورده است».
 *
 * هر کوئری‌ای که از این شرط استفاده می‌کند باید پارامترهای
 * `refundTxType: TransactionType.REFUND` و
 * `refundedMetadataPattern: REFUNDED_METADATA_PATTERN` را تنظیم کند.
 *
 * @param paymentIdExpression عبارت SQL برای شناسهٔ پرداخت
 * @param metadataExpression ستون JSON متادیتای همان پرداخت
 */
export function notRefundedCondition(
  paymentIdExpression: string,
  metadataExpression: string,
) {
  return `(
    COALESCE(${metadataExpression}, '') NOT LIKE :refundedMetadataPattern
    AND ${paymentIdExpression} NOT IN ${REFUNDED_PAYMENT_IDS_SUBQUERY}
  )`;
}

/** پارامترهای مشترک شرطِ «برگشت‌نخورده» */
export const NOT_REFUNDED_PARAMS = {
  refundedMetadataPattern: REFUNDED_METADATA_PATTERN,
  refundTxType: TransactionType.REFUND,
};
