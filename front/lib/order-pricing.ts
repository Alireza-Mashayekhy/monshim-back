export const DEFAULT_COMMISSION_PERCENT = 10;

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
  commissionPercent: number;
  commissionAmount: number;
  remainingInSalon: number;
  amountToPay: number;
}

function toAmount(value: number | string | null | undefined): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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
  options?: { commissionPercent?: number | string | null },
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

  const rawPercent = options?.commissionPercent;
  const parsedPercent =
    rawPercent !== undefined && rawPercent !== null && rawPercent !== ''
      ? Number(rawPercent)
      : Number.NaN;
  const commissionPercent =
    Number.isFinite(parsedPercent) && parsedPercent >= 0 && parsedPercent <= 100
      ? parsedPercent
      : DEFAULT_COMMISSION_PERCENT;

  const commissionAmount =
    depositAmount > 0
      ? Math.round((maxPayableAmount * commissionPercent) / 100)
      : 0;
  const remainingInSalon = Math.max(0, totalServicePrice - depositAmount);

  return {
    items,
    totalServicePrice,
    depositAmount,
    maxPayableAmount,
    commissionPercent,
    commissionAmount,
    remainingInSalon,
    amountToPay: depositAmount + commissionAmount,
  };
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
