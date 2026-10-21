/**
 * محاسبهٔ مبلغ لغو نوبت (از سمت آرایشگر یا ادمین).
 *
 * این فایل عمداً بدون وابستگی به Nest/TypeORM است تا هم راحت تست شود و هم
 * قواعد پول در یک جای مشخص بماند.
 *
 * دو مبلغ جدا محاسبه می‌شود:
 *  - barberDebit    : همان مبلغی که واقعاً به کیف پول آرایشگر رفته بود
 *  - customerRefund : مبلغی که باید به مشتری برگردد (شامل سهم کمیسیون)
 *
 * باگ قبلی: برای پرداخت کامل، کل مبلغ پرداختی (خدمات + ۱۰٪ کمیسیون) از
 * آرایشگر کسر می‌شد، در حالی که کمیسیون هرگز به کیف پول او نرفته بود؛ یعنی
 * آرایشگر بابت لغو بیشتر از درآمدش جریمه می‌شد و مشتری هم کمیسیون
 * پرداختی‌اش را از دست می‌داد.
 */

export interface RefundPaymentLike {
  amount: number | string;
  metadata?: string | null;
}

export interface RefundBookingLike {
  price: number | string;
  canceledBy?: string | null;
}

export interface CancellationAmounts {
  barberDebit: number;
  customerRefund: number;
}

function parseMetadata(
  payment: RefundPaymentLike,
): Record<string, unknown> | null {
  if (!payment.metadata) return null;
  try {
    const parsed = JSON.parse(payment.metadata);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function computeCancellationAmounts(
  payment: RefundPaymentLike,
  linkedBookings: RefundBookingLike[],
): CancellationAmounts {
  const paidAmount = Number(payment.amount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return { barberDebit: 0, customerRefund: 0 };
  }

  const metadata = parseMetadata(payment);
  const isDepositLink =
    metadata?.depositLink === true ||
    String(metadata?.depositLink).toLowerCase() === 'true';

  /**
   * لینک بیعانه: پرداخت شامل «بیعانه + ۱۰٪ کمیسیون» است، اما فقط بیعانه به
   * کیف پول آرایشگر رفته است. پس:
   *   barberDebit    = مبلغ بیعانه
   *   customerRefund = بیعانه + کمیسیون (کل مبلغ پرداختی مشتری)
   * برای پرداخت‌های قدیمی که `depositAmount` ندارند، رفتار قبلی حفظ می‌شود.
   */
  if (isDepositLink) {
    const depositAmount = Number(metadata?.depositAmount);
    const commissionAmount = Number(metadata?.commissionAmount);

    const barberDebit =
      Number.isFinite(depositAmount) && depositAmount > 0
        ? Math.min(paidAmount, depositAmount)
        : paidAmount;

    const commissionShare =
      Number.isFinite(commissionAmount) && commissionAmount > 0
        ? Math.min(commissionAmount, Math.max(0, paidAmount - barberDebit))
        : 0;

    return {
      barberDebit: Number(barberDebit.toFixed(2)),
      customerRefund: Number((barberDebit + commissionShare).toFixed(2)),
    };
  }

  const metadataTotal = Number(metadata?.totalPrice);
  const totalServiceValue =
    Number.isFinite(metadataTotal) && metadataTotal >= 0
      ? metadataTotal
      : linkedBookings.reduce(
          (total, booking) => total + Number(booking.price || 0),
          0,
        );

  // خدماتی که خود مشتری لغو کرده، نزد آرایشگر می‌ماند و بازپرداخت ندارد.
  const customerCanceledValue = linkedBookings
    .filter(booking => booking.canceledBy === 'customer')
    .reduce((total, booking) => total + Number(booking.price || 0), 0);

  const refundableServiceValue = Math.max(
    0,
    totalServiceValue - customerCanceledValue,
  );

  const metadataCommission = Number(metadata?.commissionAmount);
  const commission =
    Number.isFinite(metadataCommission) && metadataCommission > 0
      ? metadataCommission
      : 0;

  // سهم متناسب کمیسیون از خدماتی که لغو می‌شود
  const commissionShare =
    totalServiceValue > 0
      ? (commission * refundableServiceValue) / totalServiceValue
      : 0;

  const barberDebit = Number(
    Math.min(paidAmount, refundableServiceValue).toFixed(2),
  );
  const customerRefund = Number(
    Math.min(paidAmount, refundableServiceValue + commissionShare).toFixed(2),
  );

  return { barberDebit, customerRefund };
}
