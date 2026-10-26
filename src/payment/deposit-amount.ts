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
 *  - کمیسیون سایت (به‌صورت پیش‌فرض پلکانی حاشیه‌ای روی جمع مبلغ قابل پرداخت آنلاین
 *    هر رزرو با پله‌های ۱۰٪، ۷٪، ۵٪ و ۳٪ و سقف ۲۰۰٬۰۰۰ تومان):
 *      • ۰ تا ۵۰۰٬۰۰۰ تومان: ۱۰٪
 *      • ۵۰۰٬۰۰۰ تا ۱٬۵۰۰٬۰۰۰ تومان: ۷٪
 *      • ۱٬۵۰۰٬۰۰۰ تا ۲٬۵۰۰٬۰۰۰ تومان: ۵٪
 *      • مازاد بر ۲٬۵۰۰٬۰۰۰ تومان: ۳٪ (تا سقف کل ۲۰۰٬۰۰۰ تومان در هر رزرو)
 *  - مبلغ قابل پرداخت در درگاه = سهم آرایشگر + کمیسیون سایت.
 */

export const COMMISSION_RATE = 0.1;
export const DEFAULT_COMMISSION_PERCENT = 10;
export const DEFAULT_COMMISSION_MAX_AMOUNT = 200_000;

export type CommissionMode = 'tiered' | 'flat';

export interface CommissionTier {
  /** سقف بازه به تومان (`null` یعنی بدون سقف تا بی‌نهایت برای آخرین پله) */
  upTo: number | null;
  /** درصد کمیسیون برای مازاد مبلغ در این پله (۰ تا ۱۰۰) */
  percent: number;
}

export const DEFAULT_COMMISSION_TIERS: readonly CommissionTier[] = [
  { upTo: 500_000, percent: 10 },
  { upTo: 1_500_000, percent: 7 },
  { upTo: 2_500_000, percent: 5 },
  { upTo: null, percent: 3 },
];

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
  /** حالت محاسبه کمیسیون: `tiered` (پلکانی - پیش‌فرض) یا `flat` (درصد ثابت) */
  commissionMode?: CommissionMode | null;
  /** پله‌های کمیسیون در حالت پلکانی */
  commissionTiers?: readonly CommissionTier[] | string | null;
  /** سقف مبلغ کمیسیون به تومان برای هر رزرو (`null` یا `0` یعنی بدون سقف؛ `undefined` یعنی پیش‌فرض ۲۰۰٬۰۰۰) */
  commissionMaxAmount?: number | string | null;
  /** درصد کمیسیون پایه در حالت درصد ثابت (`flat`) */
  commissionPercent?: number | string | null;
  /** نرخ کمیسیون اعشاری (۰ تا ۱) برای سازگاری با فراخوانی‌های قدیمی در حالت `flat` */
  commissionRate?: number;
}

export interface ComputedOrderPricing {
  items: ComputedServicePricing[];
  /** مجموع قیمت کامل همهٔ خدمات */
  totalServicePrice: number;
  /** جمع بیعانه‌ها (و مبلغ کاملِ خدماتی که بیعانه ندارند) — سهم کیف پول آرایشگر و مبنای کمیسیون */
  depositAmount: number;
  /** بیشترین مبلغ قابل پرداخت در بین آیتم‌ها (صرفاً برای سازگاری خروجی) */
  maxPayableAmount: number;
  /** حالت اعمال‌شده کمیسیون */
  commissionMode: CommissionMode;
  /** درصد مؤثر کمیسیون اعمال‌شده روی مبلغ پرداخت آنلاین (مثلاً ۸.۵ یا ۵) */
  commissionPercent: number;
  /** مبلغ کمیسیون سایت به تومان */
  commissionAmount: number;
  /** سقف کمیسیون اعمال‌شده (در صورت فعال بودن سقف) */
  commissionMaxAmount: number | null;
  /** آیا کمیسیون این سفارش به سقف مجاز رسیده است؟ */
  isCommissionCapped: boolean;
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
  /** درصد مؤثر کمیسیون */
  commissionPercent: number;
  /** آیا به سقف کمیسیون رسیده است؟ */
  isCommissionCapped: boolean;
  /** مبلغی که مشتری در درگاه پرداخت می‌کند */
  amountToPay: number;
  /** مجموع قیمت کل خدمات */
  totalServicePrice: number;
  /** مبلغ باقیمانده جهت تسویه حضوری در سالن */
  remainingInSalon: number;
}

export interface DepositAmountInput
  extends ServicePricingInput, OrderPricingOptions {}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeCommissionTiers(
  rawTiers?: readonly CommissionTier[] | string | null,
): CommissionTier[] {
  let parsed: unknown = rawTiers;
  if (typeof rawTiers === 'string') {
    const trimmed = rawTiers.trim();
    if (!trimmed) {
      return DEFAULT_COMMISSION_TIERS.map(t => ({ ...t }));
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return DEFAULT_COMMISSION_TIERS.map(t => ({ ...t }));
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return DEFAULT_COMMISSION_TIERS.map(t => ({ ...t }));
  }

  const finiteTiers: CommissionTier[] = [];
  let catchAllPercent: number | null = null;

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const rawPercent = Number((entry as CommissionTier).percent);
    if (!Number.isFinite(rawPercent) || rawPercent < 0 || rawPercent > 100) {
      continue;
    }

    const rawUpTo = (entry as CommissionTier).upTo;
    if (
      rawUpTo === null ||
      rawUpTo === undefined ||
      (rawUpTo as unknown) === ''
    ) {
      catchAllPercent = rawPercent;
      continue;
    }

    const numericUpTo = Math.round(Number(rawUpTo));
    if (Number.isFinite(numericUpTo) && numericUpTo > 0) {
      finiteTiers.push({ upTo: numericUpTo, percent: rawPercent });
    }
  }

  finiteTiers.sort((a, b) => (a.upTo ?? 0) - (b.upTo ?? 0));

  // حذف سقف‌های تکراری احتمالی
  const dedupedFinite: CommissionTier[] = [];
  for (const tier of finiteTiers) {
    const prev = dedupedFinite[dedupedFinite.length - 1];
    if (prev && prev.upTo === tier.upTo) {
      dedupedFinite[dedupedFinite.length - 1] = tier;
    } else {
      dedupedFinite.push(tier);
    }
  }

  if (catchAllPercent !== null) {
    dedupedFinite.push({ upTo: null, percent: catchAllPercent });
  } else if (dedupedFinite.length > 0) {
    // اگر پلهٔ آخر بدون سقف تعریف نشده بود، آخرین پله به عنوان پلهٔ نهایی ادامه می‌یابد
    const last = dedupedFinite[dedupedFinite.length - 1];
    dedupedFinite.push({ upTo: null, percent: last.percent });
  }

  return dedupedFinite.length > 0
    ? dedupedFinite
    : DEFAULT_COMMISSION_TIERS.map(t => ({ ...t }));
}

function resolveCommissionMaxAmount(
  rawMax: number | string | null | undefined,
): number | null {
  if (rawMax === undefined) {
    return DEFAULT_COMMISSION_MAX_AMOUNT;
  }
  if (rawMax === null || rawMax === '') {
    return null;
  }
  const parsed = Math.round(Number(rawMax));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function resolveFlatRate(options?: OrderPricingOptions): {
  rate: number;
  percent: number;
} {
  if (
    options?.commissionPercent !== undefined &&
    options.commissionPercent !== null &&
    options.commissionPercent !== ''
  ) {
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

/**
 * محاسبهٔ کمیسیون پلکانی حاشیه‌ای (Marginal Progressive) به همراه سقف ریالی/تومانی.
 */
export function computeProgressiveCommission(
  baseAmount: number,
  options?: OrderPricingOptions,
): {
  commissionMode: CommissionMode;
  commissionAmount: number;
  commissionPercent: number;
  commissionMaxAmount: number | null;
  isCommissionCapped: boolean;
} {
  const mode: CommissionMode =
    options?.commissionMode === 'flat' ? 'flat' : 'tiered';
  const maxAmount = resolveCommissionMaxAmount(options?.commissionMaxAmount);

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return {
      commissionMode: mode,
      commissionAmount: 0,
      commissionPercent:
        mode === 'flat'
          ? resolveFlatRate(options).percent
          : (normalizeCommissionTiers(options?.commissionTiers)[0]?.percent ??
            DEFAULT_COMMISSION_PERCENT),
      commissionMaxAmount: maxAmount,
      isCommissionCapped: false,
    };
  }

  let uncappedCommission = 0;

  if (mode === 'flat') {
    const { rate } = resolveFlatRate(options);
    uncappedCommission = Math.round(baseAmount * rate);
  } else {
    const tiers = normalizeCommissionTiers(options?.commissionTiers);
    let previousUpper = 0;
    let rawSum = 0;

    for (const tier of tiers) {
      if (baseAmount <= previousUpper) break;

      if (tier.upTo === null) {
        const portion = baseAmount - previousUpper;
        rawSum += (portion * tier.percent) / 100;
        previousUpper = baseAmount;
        break;
      }

      const upper = Math.max(previousUpper, tier.upTo);
      const portion = Math.max(0, Math.min(baseAmount, upper) - previousUpper);
      rawSum += (portion * tier.percent) / 100;
      previousUpper = upper;
    }

    uncappedCommission = Math.round(rawSum);
  }

  const isCommissionCapped =
    maxAmount !== null && uncappedCommission >= maxAmount;
  const commissionAmount =
    maxAmount !== null
      ? Math.min(uncappedCommission, maxAmount)
      : uncappedCommission;
  const commissionPercent =
    Math.round((commissionAmount / baseAmount) * 10000) / 100;

  return {
    commissionMode: mode,
    commissionAmount,
    commissionPercent,
    commissionMaxAmount: maxAmount,
    isCommissionCapped,
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
  const depositAmount = items.reduce(
    (sum, item) => sum + item.payableAmount,
    0,
  );
  const maxPayableAmount = items.reduce(
    (max, item) => Math.max(max, item.payableAmount),
    0,
  );

  const commission = computeProgressiveCommission(depositAmount, options);
  const remainingInSalon = Math.max(0, totalServicePrice - depositAmount);

  return {
    items,
    totalServicePrice,
    depositAmount,
    maxPayableAmount,
    commissionMode: commission.commissionMode,
    commissionPercent: commission.commissionPercent,
    commissionAmount: commission.commissionAmount,
    commissionMaxAmount: commission.commissionMaxAmount,
    isCommissionCapped: commission.isCommissionCapped,
    remainingInSalon,
    amountToPay: depositAmount + commission.commissionAmount,
  };
}

export function computeDepositAmounts(
  input: DepositAmountInput,
): DepositAmounts {
  const pricing = computeOrderPricing([input], input);

  return {
    depositAmount: pricing.depositAmount,
    commissionAmount: pricing.commissionAmount,
    commissionPercent: pricing.commissionPercent,
    isCommissionCapped: pricing.isCommissionCapped,
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
