import {
  computeCancellationAmounts,
  RefundBookingLike,
  RefundPaymentLike,
} from './booking-refund';

/**
 * تست قواعد پول در لغو نوبت (آرایشگر/ادمین).
 * فایل `booking-refund.ts` عمداً بدون وابستگی به Nest است تا مستقیم تست شود.
 */
const service = {
  getCancellationAmounts: computeCancellationAmounts,
};

function makePayment(
  amount: number,
  metadata: Record<string, unknown>,
): RefundPaymentLike {
  return { amount, metadata: JSON.stringify(metadata) };
}

function makeBooking(
  price: number,
  canceledBy: 'customer' | null = null,
): RefundBookingLike {
  return { price, canceledBy };
}

describe('computeCancellationAmounts', () => {
  it('برای یک خدمت، فقط مبلغ خدمات از آرایشگر کسر و کل پرداخت به مشتری برگردانده می‌شود', () => {
    const payment = makePayment(110_000, {
      totalPrice: 100_000,
      commissionAmount: 10_000,
      items: [{ price: 100_000 }],
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000),
    ]);

    expect(result.barberDebit).toBe(100_000);
    expect(result.customerRefund).toBe(110_000);
  });

  it('سهم کمیسیون را برای خدماتی که مشتری قبلاً لغو کرده، برنمی‌گرداند', () => {
    const payment = makePayment(210_000, {
      totalPrice: 200_000,
      commissionAmount: 10_000,
      items: [{ price: 100_000 }, { price: 50_000 }, { price: 50_000 }],
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000),
      makeBooking(50_000, 'customer'),
      makeBooking(50_000),
    ]);

    expect(result.barberDebit).toBe(150_000);
    // ۱۵۰٬۰۰۰ خدمات + ۷٬۵۰۰ سهم کمیسیون
    expect(result.customerRefund).toBe(157_500);
  });

  it('برای لینک بیعانه، همان مبلغ بیعانه کسر و برگردانده می‌شود', () => {
    const payment = makePayment(30_000, {
      depositLink: true,
      bookingId: 'booking-1',
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000),
    ]);

    expect(result.barberDebit).toBe(30_000);
    expect(result.customerRefund).toBe(30_000);
  });

  it('اگر همهٔ ردیف‌ها را مشتری لغو کرده باشد، مبلغی بازپرداخت نمی‌شود', () => {
    const payment = makePayment(110_000, {
      totalPrice: 100_000,
      commissionAmount: 10_000,
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000, 'customer'),
    ]);

    expect(result.barberDebit).toBe(0);
    expect(result.customerRefund).toBe(0);
  });

  it('بدون totalPrice در متادیتا، از مجموع قیمت ردیف‌ها استفاده می‌کند', () => {
    const payment = makePayment(110_000, {});

    const result = service.getCancellationAmounts(payment, [
      makeBooking(60_000),
      makeBooking(50_000),
    ]);

    expect(result.barberDebit).toBe(110_000);
    expect(result.customerRefund).toBe(110_000);
  });

  it('هرگز بیشتر از مبلغ پرداخت‌شده بازپرداخت نمی‌کند', () => {
    const payment = makePayment(50_000, {
      totalPrice: 100_000,
      commissionAmount: 10_000,
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000),
    ]);

    expect(result.barberDebit).toBe(50_000);
    expect(result.customerRefund).toBe(50_000);
  });
});
