/**
 * محاسبهٔ یکپارچهٔ مبالغ پرداخت نوبت (رزرو آنلاین و لینک بیعانه).
 *
 * قاعدهٔ کسب‌وکار محصول:
 *  - برای هر خدمت: اگر «بیعانه» (`depositPrice`) تعیین شده باشد، سهم پرداخت
 *    آنلاینِ آن خدمت برابر همان بیعانه است؛ و اگر بیعانه نداشته باشد، کل مبلغ
 *    خدمت (`price`) حساب می‌شود (باقیماندهٔ خدمات بیعانه‌دار هنگام حضور در
 *    سالن تسویه می‌شود).
 *  - مبلغ سهم آرایشگر = جمع بیعانه‌ها (یا مبلغ کل برای خدماتی که بیعانه ندارند).
 *    دقیقاً همین مبلغ پس از پرداخت موفق به کیف پول آرایشگر واریز می‌شود.
 *  - کمیسیون سایت = درصدی (پیش‌فرض ۱۰٪ از تنظیمات سایت) از «بیشترین بیعانه»
 *    (بیشترین سهم پرداخت آنلاین در بین خدمات انتخاب‌شده).
 *  - مبلغ قابل پرداخت در درگاه = سهم آرایشگر + کمیسیون سایت.
 */

export const COMMISSION_RATE = 0.1;
export const DEFAULT_COMMISSION_PERCENT = 10;

export interface ServicePricingInput {
  price: number | string;
  depositPrice?: number | string | null;
}

export interface ComputedServicePricing {
  /** قیمت کامل خدمت */
  servicePrice: number;
  /** مبلغ بیعانهٔ تعریف‌شده روی خدمت (در صورت وجود) */
  depositPrice: number | null;
  /** آیا این خدمت بیعانهٔ مجزا دارد؟ */
  hasDeposit: boolean;
  /** سهم قابل پرداخت آنلاین برای این خدمت (بیعانه؛ در نبود بیعانه، کل قیمت خدمت) */
  payableAmount: number;
  /** مبلغ باقیماندهٔ این خدمت برای پرداخت حضوری در سالن */
  remainingInSalon: number;
}

export interface OrderPricingOptions {
  /** درصد کمیسیون سایت (۰ تا ۱۰۰) — پیش‌فرض ۱۰٪ */
  commissionPercent?: number | string | null;
  /** نرخ کمیسیون اعشاری (۰ تا ۱) برای سازگاری */
  commissionRate?: number;
}

export interface ComputedOrderPricing {
  items: ComputedServicePricing[];
  /** مجموع قیمت کامل همهٔ خدمات */
  totalServicePrice: number;
  /** جمع بیعانه‌ها (و مبلغ کاملِ خدماتی که بیعانه ندارند) — سهم کیف پول آرایشگر */
  depositAmount: number;
  /** بیشترین مبلغ قابل پرداخت در بین آیتم‌ها (مبنای کمیسیون) */
  maxPayableAmount: number;
  /** درصد کمیسیون اعمال‌شده */
  commissionPercent: number;
  /** مبلغ کمیسیون سایت */
  commissionAmount: number;
  /** کل مبلغ باقیمانده جهت تسویه حضوری در سالن */
  remainingInSalon: number;
  /** کل مبلغ قابل پرداخت در درگاه (depositAmount + commissionAmount) */
  amountToPay: number;
}

export interface DepositAmounts {
  /** مبلغ سهم آرایشگر (جمع بیعانه‌ها / خدمات بدون بیعانه) که به کیف پول آرایشگر می‌رود */
  depositAmount: number;
  /** کمیسیون سایت */
  commissionAmount: number;
  /** مبلغی که مشتری در درگاه پرداخت می‌کند */
  amountToPay: number;
  /** مجموع قیمت کل خدمات */
  totalServicePrice: number;
  /** مبلغ باقیمانده جهت تسویه حضوری در سالن */
  remainingInSalon: number;
}

export interface DepositAmountInput extends ServicePricingInput {
  commissionPercent?: number | string | null;
  commissionRate?: number;
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function resolveCommissionRate(options?: OrderPricingOptions): {
  rate: number;
  percent: number;
} {
  if (options?.commissionPercent !== undefined && options.commissionPercent !== null && options.commissionPercent !== '') {
    const parsed = Number(options.commissionPercent);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      return { rate: parsed / 100, percent: parsed };
    }
  }

  if (
    typeof options?.commissionRate === 'number' &&
    Number.isFinite(options.commissionRate) &&
    options.commissionRate >= 0
  ) {
    return {
      rate: options.commissionRate,
      percent: Math.round(options.commissionRate * 10000) / 100,
    };
  }

  return {
    rate: COMMISSION_RATE,
    percent: DEFAULT_COMMISSION_PERCENT,
  };
}

export function computeServicePricing(
  input: ServicePricingInput,
): ComputedServicePricing {
  const servicePrice = Math.max(0, Math.round(toAmount(input.price)));
  const rawDeposit = toAmount(input.depositPrice);
  const hasDeposit = rawDeposit > 0;
  const normalizedDeposit = hasDeposit
    ? Math.round(Math.min(rawDeposit, servicePrice))
    : null;
  const payableAmount =
    normalizedDeposit !== null ? normalizedDeposit : servicePrice;
  const remainingInSalon = Math.max(0, servicePrice - payableAmount);

  return {
    servicePrice,
    depositPrice: normalizedDeposit,
    hasDeposit,
    payableAmount,
    remainingInSalon,
  };
}

export function computeOrderPricing(
  services: ServicePricingInput[],
  options?: OrderPricingOptions,
): ComputedOrderPricing {
  const items = services.map(computeServicePricing);
  const totalServicePrice = items.reduce(
    (sum, item) => sum + item.servicePrice,
    0,
  );
  const depositAmount = items.reduce((sum, item) => sum + item.payableAmount, 0);
  const maxPayableAmount = items.reduce(
    (max, item) => Math.max(max, item.payableAmount),
    0,
  );

  const { rate, percent } = resolveCommissionRate(options);
  const commissionAmount =
    depositAmount > 0 ? Math.round(maxPayableAmount * rate) : 0;
  const remainingInSalon = Math.max(0, totalServicePrice - depositAmount);

  return {
    items,
    totalServicePrice,
    depositAmount,
    maxPayableAmount,
    commissionPercent: percent,
    commissionAmount,
    remainingInSalon,
    amountToPay: depositAmount + commissionAmount,
  };
}

export function computeDepositAmounts(
  input: DepositAmountInput,
): DepositAmounts {
  const pricing = computeOrderPricing([input], {
    commissionPercent: input.commissionPercent,
    commissionRate: input.commissionRate,
  });

  return {
    depositAmount: pricing.depositAmount,
    commissionAmount: pricing.commissionAmount,
    amountToPay: pricing.amountToPay,
    totalServicePrice: pricing.totalServicePrice,
    remainingInSalon: pricing.remainingInSalon,
  };
}

/**
 * استخراج توکن پایهٔ لینک بیعانه (بدون پسوند شماره ردیف `:1`, `:2` برای سفارش‌های چندخدمتی)
 * و اعتبارسنجی کاراکترهای مجاز برای جلوگیری از تزریق الگو در SQL LIKE.
 */
export function extractBaseDepositToken(
  rawToken: string | null | undefined,
): string | null {
  const base = String(rawToken ?? '')
    .trim()
    .split(':')[0]
    ?.trim();

  if (!base || base.length < 8 || base.length > 64) {
    return null;
  }

  if (!/^[a-zA-Z0-9-]+$/.test(base)) {
    return null;
  }

  return base;
}
