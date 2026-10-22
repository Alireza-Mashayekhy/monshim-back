/**
 * محاسبهٔ مبلغ لینک بیعانه.
 *
 * قاعدهٔ کسب‌وکار (همان قاعدهٔ رزرو آنلاین):
 *   مبلغی که مشتری می‌پردازد = بیعانه + کمیسیون سایت
 *
 * پیش از این لینک بیعانه فقط «مبلغ بیعانه» را از مشتری می‌گرفت و کمیسیون
 * سایت هیچ‌جا گرفته نمی‌شد؛ یعنی مشتری که از طریق لینک بیعانه رزرو می‌کرد
 * کمیسیون نمی‌داد، در حالی که مشتریِ رزرو آنلاین ۱۰٪ اضافه می‌پرداخت.
 *
 * نکتهٔ مهم دربارهٔ کیف پول آرایشگر: از مبلغ پرداختی، فقط «بیعانه» به کیف
 * پول آرایشگر می‌رود و کمیسیون نزد سامانه می‌ماند — دقیقاً مثل رزرو آنلاین
 * که کمیسیون وارد کیف پول آرایشگر نمی‌شود.
 */

export const COMMISSION_RATE = 0.1;
export const DEFAULT_DEPOSIT_PERCENT = 30;
export const DEFAULT_COMMISSION_PERCENT = 10;

export type CommissionBase = 'total' | 'deposit';

export interface DepositAmounts {
  /** مبلغ بیعانه که به کیف پول آرایشگر می‌رود */
  depositAmount: number;
  /** کمیسیون سایت */
  commissionAmount: number;
  /** مبلغی که مشتری در درگاه پرداخت می‌کند */
  amountToPay: number;
}

export interface DepositAmountInput {
  /** قیمت خدمت رزروشده */
  price: number | string;
  /** مبلغ بیعانهٔ ثابتِ خدمت (اگر آرایشگر تعیین کرده باشد) */
  depositPrice?: number | string | null;
  /** درصد بیعانهٔ سایت وقتی مبلغ ثابت وجود ندارد */
  depositPercent?: number | string | null;
  /** درصد کمیسیون سایت (۰ تا ۱۰۰) - روش جدید */
  commissionPercent?: number | string | null;
  /** نرخ کمیسیون قدیمی (۰ تا ۱) برای سازگاری */
  commissionRate?: number;
  /** مبنای کمیسیون: total (درصدِ ارزش خدمت) یا deposit (درصدِ بیعانه) */
  commissionBase?: CommissionBase | string | null;
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function computeDepositAmounts(
  input: DepositAmountInput,
): DepositAmounts {
  const servicePrice = Math.max(0, toAmount(input.price));
  const rawDeposit = toAmount(input.depositPrice);

  const percent = toAmount(input.depositPercent);

  const deposit =
    rawDeposit > 0
      ? rawDeposit
      : (servicePrice *
          (percent > 0 && percent <= 100 ? percent : DEFAULT_DEPOSIT_PERCENT)) /
        100;

  // بیعانه هرگز از ارزش خدمت بیشتر نمی‌شود.
  const depositAmount = Math.round(
    Math.min(Math.max(deposit, 0), servicePrice),
  );

  // تعیین نرخ کمیسیون: اولویت با commissionPercent جدید، سپس commissionRate قدیمی
  let rate: number;
  const commissionPercentValue = toAmount(input.commissionPercent);
  if (commissionPercentValue > 0 && commissionPercentValue <= 100) {
    rate = commissionPercentValue / 100;
  } else if (
    typeof input.commissionRate === 'number' &&
    Number.isFinite(input.commissionRate) &&
    input.commissionRate >= 0
  ) {
    rate = input.commissionRate;
  } else if (
    input.commissionPercent != null &&
    commissionPercentValue === 0
  ) {
    // commissionPercent = 0 یعنی کمیسیون صفر
    rate = 0;
  } else {
    rate = COMMISSION_RATE;
  }

  const base =
    input.commissionBase === 'deposit' ? 'deposit' : 'total';

  // همان قاعدهٔ رزرو آنلاین برای یک خدمت: درصدی از ارزش خدمت یا بیعانه
  const commissionAmount =
    depositAmount > 0
      ? base === 'deposit'
        ? Math.round(depositAmount * rate)
        : Math.round(servicePrice * rate)
      : 0;

  return {
    depositAmount,
    commissionAmount,
    amountToPay: depositAmount + commissionAmount,
  };
}
