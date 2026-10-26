function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export const DEFAULT_COMMISSION_PERCENT = 10;
export const DEFAULT_COMMISSION_MAX_AMOUNT = 200_000;

export type CommissionMode = 'tiered' | 'flat';

export interface CommissionTier {
  upTo: number | null;
  percent: number;
}

export const DEFAULT_COMMISSION_TIERS: readonly CommissionTier[] = [
  { upTo: 500_000, percent: 10 },
  { upTo: 1_500_000, percent: 7 },
  { upTo: 2_500_000, percent: 5 },
  { upTo: null, percent: 3 },
];

export interface OrderPricingOptions {
  commissionMode?: CommissionMode | null;
  commissionTiers?: readonly CommissionTier[] | string | null;
  commissionMaxAmount?: number | string | null;
  commissionPercent?: number | string | null;
}

export interface ServicePricingInput {
  price: number | string;
  depositPrice?: number | string | null;
}

export interface ComputedServicePricing {
  servicePrice: number;
  depositPrice: number | null;
  hasDeposit: boolean;
  payableAmount: number;
  remainingInSalon: number;
}

export interface ComputedOrderPricing {
  items: ComputedServicePricing[];
  totalServicePrice: number;
  depositAmount: number;
  maxPayableAmount: number;
  commissionMode: CommissionMode;
  commissionPercent: number;
  commissionAmount: number;
  commissionMaxAmount: number | null;
  isCommissionCapped: boolean;
  remainingInSalon: number;
  amountToPay: number;
}

function toAmount(value: number | string | null | undefined): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

export function computeProgressiveCommission(
  baseAmount: number,
  options?: OrderPricingOptions | null,
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

  const rawFlatPercent = options?.commissionPercent;
  const parsedFlat =
    rawFlatPercent !== undefined &&
    rawFlatPercent !== null &&
    rawFlatPercent !== ''
      ? Number(rawFlatPercent)
      : Number.NaN;
  const flatPercent =
    Number.isFinite(parsedFlat) && parsedFlat >= 0 && parsedFlat <= 100
      ? parsedFlat
      : DEFAULT_COMMISSION_PERCENT;

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return {
      commissionMode: mode,
      commissionAmount: 0,
      commissionPercent:
        mode === 'flat'
          ? flatPercent
          : (normalizeCommissionTiers(options?.commissionTiers)[0]?.percent ??
              DEFAULT_COMMISSION_PERCENT),
      commissionMaxAmount: maxAmount,
      isCommissionCapped: false,
    };
  }

  let uncappedCommission = 0;

  if (mode === 'flat') {
    uncappedCommission = Math.round((baseAmount * flatPercent) / 100);
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
  options?: OrderPricingOptions | null,
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

/**
 * برچسب شفاف کمیسیون برای نمایش در صورت‌حساب مشتری و پیش‌نمایش آرایشگر.
 */
export function formatCommissionLabel(
  pricing: {
    commissionPercent: number;
    commissionMode?: CommissionMode | null;
    commissionMaxAmount?: number | null;
    isCommissionCapped?: boolean;
  },
  title = 'کمیسیون سایت',
): string {
  const formattedPercent = toFaDigits(
    Number(pricing.commissionPercent.toFixed(2)).toString(),
  );

  if (pricing.isCommissionCapped && pricing.commissionMaxAmount) {
    const capFormatted = toFaDigits(
      pricing.commissionMaxAmount.toLocaleString('en-US'),
    );
    return `${title} (${formattedPercent}٪ — سقف ${capFormatted} تومان)`;
  }

  if (pricing.commissionMode !== 'flat') {
    return `${title} (${formattedPercent}٪ پلکانی)`;
  }

  return `${title} (${formattedPercent}٪)`;
}

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

  return base;
}
