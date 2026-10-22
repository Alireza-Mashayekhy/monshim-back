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

  it('لینک بیعانه: فقط بیعانه از آرایشگر کسر و بیعانه + کمیسیون به مشتری برمی‌گردد', () => {
    // بیعانه ۳۰٬۰۰۰ + کمیسیون ۱۰٬۰۰۰ = ۴۰٬۰۰۰ پرداخت‌شده
    const payment = makePayment(40_000, {
      depositLink: true,
      bookingId: 'booking-1',
      depositAmount: 30_000,
      commissionAmount: 10_000,
      totalPrice: 100_000,
    });

    const result = service.getCancellationAmounts(payment, [
      makeBooking(100_000),
    ]);

    // تنها مبلغی که به کیف پول آرایشگر رفته، بیعانه است
    expect(result.barberDebit).toBe(30_000);
    // مشتری هر چه داده (بیعانه + کمیسیون) را پس می‌گیرد
    expect(result.customerRefund).toBe(40_000);
  });

  it('لینک بیعانهٔ قدیمی (بدون تفکیک کمیسیون): کل مبلغ پرداختی برمی‌گردد', () => {
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

  it('لینک بیعانهٔ چندخدمتی: سهم آرایشگر و کل مبلغ پرداختی مشتری را دقیق برمی‌گرداند', () => {
    const payment = makePayment(370_000, {
      depositLink: true,
      depositToken: 'a1b2c3d4e5f60718293a4b5c',
      bookingId: 'b1',
      bookingIds: ['b1', 'b2'],
      depositAmount: 350_000,
      commissionAmount: 20_000,
      totalPrice: 700_000,
      items: [
        { bookingId: 'b1', price: 500_000, payableAmount: 150_000 },
        { bookingId: 'b2', price: 200_000, payableAmount: 200_000 },
      ],
    });

    const result = service.getCancellationAmounts(payment, [
      { id: 'b1', price: 500_000, canceledBy: null },
      { id: 'b2', price: 200_000, canceledBy: null },
    ]);

    expect(result.barberDebit).toBe(350_000);
    expect(result.customerRefund).toBe(370_000);
  });
});
