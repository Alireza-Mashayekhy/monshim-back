/**
 * محاسبهٔ مبلغ لغو نوبت (از سمت آرایشگر یا ادمین).
 *
 * این فایل عمداً بدون وابستگی به Nest/TypeORM است تا هم راحت تست شود و هم
 * قواعد پول در یک جای مشخص بماند.
 *
 * دو مبلغ جدا محاسبه می‌شود:
 *  - barberDebit    : همان مبلغی که واقعاً به کیف پول آرایشگر رفته بود
 *  - customerRefund : مبلغی که باید به مشتری برگردد (شامل سهم کمیسیون)
 */

export interface RefundPaymentLike {
  amount: number | string;
  metadata?: string | null;
}

export interface RefundBookingLike {
  id?: string;
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

  // اگر همهٔ ردیف‌های سفارش قبلاً توسط خود مشتری لغو شده باشند، بازپرداختی انجام نمی‌شود.
  if (
    linkedBookings.length > 0 &&
    linkedBookings.every(booking => booking.canceledBy === 'customer')
  ) {
    return { barberDebit: 0, customerRefund: 0 };
  }

  const metadata = parseMetadata(payment);
  const isDepositLink =
    metadata?.depositLink === true ||
    String(metadata?.depositLink).toLowerCase() === 'true';

  if (isDepositLink) {
    const depositAmount = Number(metadata?.depositAmount);
    const commissionAmount = Number(metadata?.commissionAmount);

    const totalBarberCredit =
      Number.isFinite(depositAmount) && depositAmount > 0
        ? Math.min(paidAmount, depositAmount)
        : paidAmount;

    const totalCommission =
      Number.isFinite(commissionAmount) && commissionAmount > 0
        ? Math.min(commissionAmount, Math.max(0, paidAmount - totalBarberCredit))
        : 0;

    // اگر بخشی از خدمات توسط مشتری لغو شده باشد، سهم پرداختی همان ردیف‌ها کسر می‌شود.
    const metaItems = Array.isArray(metadata?.items)
      ? (metadata.items as Array<Record<string, unknown>>)
      : [];
    const customerCanceledShare = linkedBookings
      .filter(booking => booking.canceledBy === 'customer')
      .reduce((sum, booking) => {
        const matched = metaItems.find(
          item => booking.id && String(item.bookingId ?? '') === booking.id,
        );
        const itemPayable = Number(matched?.payableAmount);
        return sum + (Number.isFinite(itemPayable) && itemPayable > 0 ? itemPayable : 0);
      }, 0);

    const barberDebit = Math.max(0, totalBarberCredit - customerCanceledShare);
    const commissionShare =
      totalBarberCredit > 0
        ? (totalCommission * barberDebit) / totalBarberCredit
        : 0;

    return {
      barberDebit: Number(barberDebit.toFixed(2)),
      customerRefund: Number(
        Math.min(paidAmount, barberDebit + commissionShare).toFixed(2),
      ),
    };
  }

  const explicitDepositAmount = Number(metadata?.depositAmount);
  const metadataTotal = Number(metadata?.totalPrice);
  const totalBarberValue =
    Number.isFinite(explicitDepositAmount) && explicitDepositAmount > 0
      ? explicitDepositAmount
      : Number.isFinite(metadataTotal) && metadataTotal >= 0
        ? metadataTotal
        : linkedBookings.reduce(
            (total, booking) => total + Number(booking.price || 0),
            0,
          );

  const metaItems = Array.isArray(metadata?.items)
    ? (metadata.items as Array<Record<string, unknown>>)
    : [];

  // خدماتی که خود مشتری لغو کرده، نزد آرایشگر می‌ماند و بازپرداخت ندارد.
  const customerCanceledValue = linkedBookings
    .filter(booking => booking.canceledBy === 'customer')
    .reduce((total, booking, index) => {
      const matched =
        metaItems.find(
          item => booking.id && String(item.bookingId ?? '') === booking.id,
        ) ?? metaItems[index];
      const itemPayable = Number(matched?.payableAmount);
      if (Number.isFinite(itemPayable) && itemPayable > 0) {
        return total + itemPayable;
      }
      return total + Number(booking.price || 0);
    }, 0);

  const refundableBarberValue = Math.max(
    0,
    totalBarberValue - customerCanceledValue,
  );

  const metadataCommission = Number(metadata?.commissionAmount);
  const commission =
    Number.isFinite(metadataCommission) && metadataCommission > 0
      ? metadataCommission
      : 0;

  // سهم متناسب کمیسیون از خدماتی که لغو می‌شود
  const commissionShare =
    totalBarberValue > 0
      ? (commission * refundableBarberValue) / totalBarberValue
      : 0;

  const barberDebit = Number(
    Math.min(paidAmount, refundableBarberValue).toFixed(2),
  );
  const customerRefund = Number(
    Math.min(paidAmount, refundableBarberValue + commissionShare).toFixed(2),
  );

  return { barberDebit, customerRefund };
}
