import {
  computeDepositAmounts,
  computeOrderPricing,
  extractBaseDepositToken,
} from './deposit-amount';

describe('computeOrderPricing & computeDepositAmounts', () => {
  it('وقتی خدمت بیعانه ندارد، کل مبلغ خدمت + ۱۰٪ خودش محاسبه می‌شود', () => {
    const result = computeDepositAmounts({
      price: 1_000_000,
    });

    expect(result.totalServicePrice).toBe(1_000_000);
    expect(result.depositAmount).toBe(1_000_000);
    expect(result.commissionAmount).toBe(100_000);
    expect(result.remainingInSalon).toBe(0);
    expect(result.amountToPay).toBe(1_100_000);
  });

  it('وقتی خدمت مبلغ بیعانه دارد، همان بیعانه + ۱۰٪ بیعانه محاسبه می‌شود و مابقی در سالن می‌ماند', () => {
    const result = computeDepositAmounts({
      price: 500_000,
      depositPrice: 120_000,
    });

    expect(result.totalServicePrice).toBe(500_000);
    expect(result.depositAmount).toBe(120_000);
    expect(result.commissionAmount).toBe(12_000);
    expect(result.remainingInSalon).toBe(380_000);
    expect(result.amountToPay).toBe(132_000);
  });

  it('در سفارش چندخدمتی: جمع بیعانه‌ها (در نبود بیعانه، مبلغ کل خدمت) + ۱۰٪ بیشترین بیعانه', () => {
    const result = computeOrderPricing([
      { price: 600_000, depositPrice: 150_000 }, // سهم آنلاین: ۱۵۰٬۰۰۰ | باقیمانده سالن: ۴۵۰٬۰۰۰
      { price: 200_000, depositPrice: null }, // بدون بیعانه → سهم آنلاین: ۲۰۰٬۰۰۰ | باقیمانده: ۰
      { price: 450_000, depositPrice: 100_000 }, // سهم آنلاین: ۱۰۰٬۰۰۰ | باقیمانده سالن: ۳۵۰٬۰۰۰
    ]);

    expect(result.totalServicePrice).toBe(1_250_000);
    // ۱۵۰٬۰۰۰ + ۲۰۰٬۰۰۰ + ۱۰۰٬۰۰۰ = ۴۵۰٬۰۰۰
    expect(result.depositAmount).toBe(450_000);
    // بیشترین سهم قابل پرداخت بین آیتم‌ها: ۲۰۰٬۰۰۰ → ۱۰٪ = ۲۰٬۰۰۰
    expect(result.maxPayableAmount).toBe(200_000);
    expect(result.commissionAmount).toBe(20_000);
    expect(result.remainingInSalon).toBe(800_000);
    expect(result.amountToPay).toBe(470_000);
  });

  it('درصد کمیسیون سفارشی تنظیمات سایت را رعایت می‌کند', () => {
    const result = computeOrderPricing(
      [
        { price: 500_000, depositPrice: 150_000 },
        { price: 400_000, depositPrice: 100_000 },
      ],
      { commissionPercent: 12 },
    );

    expect(result.depositAmount).toBe(250_000);
    expect(result.maxPayableAmount).toBe(150_000);
    expect(result.commissionAmount).toBe(18_000);
    expect(result.amountToPay).toBe(268_000);
  });

  it('بیعانه هرگز از ارزش خدمت بیشتر نمی‌شود', () => {
    const result = computeDepositAmounts({
      price: 100_000,
      depositPrice: 500_000,
    });

    expect(result.depositAmount).toBe(100_000);
    expect(result.commissionAmount).toBe(10_000);
    expect(result.amountToPay).toBe(110_000);
    expect(result.remainingInSalon).toBe(0);
  });

  it('برای قیمت صفر یا نامعتبر، مبلغ صفر برمی‌گرداند', () => {
    expect(computeDepositAmounts({ price: 0 }).amountToPay).toBe(0);
    expect(computeDepositAmounts({ price: 'abc' }).amountToPay).toBe(0);
  });
});

describe('extractBaseDepositToken', () => {
  it('توکن پایه را چه با پسوند ردیف و چه بدون پسوند استخراج می‌کند', () => {
    expect(extractBaseDepositToken('a1b2c3d4e5f60718293a4b5c')).toBe(
      'a1b2c3d4e5f60718293a4b5c',
    );
    expect(extractBaseDepositToken('a1b2c3d4e5f60718293a4b5c:2')).toBe(
      'a1b2c3d4e5f60718293a4b5c',
    );
  });

  it('توکن‌های نامعتبر، کوتاه یا حاوی کاراکترهای خاص SQL را رد می‌کند', () => {
    expect(extractBaseDepositToken('')).toBeNull();
    expect(extractBaseDepositToken('short')).toBeNull();
    expect(extractBaseDepositToken('abc12345%')).toBeNull();
    expect(extractBaseDepositToken('abc_12345')).toBeNull();
  });
});
