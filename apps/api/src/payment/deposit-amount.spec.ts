import {
  computeDepositAmounts,
  computeOrderPricing,
  computeProgressiveCommission,
  extractBaseDepositToken,
} from './deposit-amount';

describe('computeOrderPricing, computeDepositAmounts & computeProgressiveCommission', () => {
  it('پله‌های استاندارد ۱۰٪، ۷٪، ۵٪ و ۳٪ را به صورت حاشیه‌ای (بدون پرش مرزی) و با سقف ۲۰۰ هزار تومان محاسبه می‌کند', () => {
    // پله ۱ (۰ تا ۵۰۰٬۰۰۰ → ۱۰٪)
    expect(computeProgressiveCommission(300_000)).toMatchObject({
      commissionAmount: 30_000,
      commissionPercent: 10,
      isCommissionCapped: false,
    });
    expect(computeProgressiveCommission(500_000)).toMatchObject({
      commissionAmount: 50_000,
      commissionPercent: 10,
      isCommissionCapped: false,
    });

    // تست ضدپرش مرزی (۵۱۰٬۰۰۰ باید ۵۰٬۰۰۰ + ۷۰۰ = ۵۰٬۷۰۰ شود، نه کمتر از ۵۰٬۰۰۰!)
    expect(computeProgressiveCommission(510_000)).toMatchObject({
      commissionAmount: 50_700,
      isCommissionCapped: false,
    });

    // پله ۲ (۵۰۰٬۰۰۰ تا ۱٬۵۰۰٬۰۰۰ → ۷٪ روی مازاد)
    expect(computeProgressiveCommission(1_000_000)).toMatchObject({
      commissionAmount: 85_000, // 50k + 35k
      commissionPercent: 8.5,
      isCommissionCapped: false,
    });
    expect(computeProgressiveCommission(1_500_000)).toMatchObject({
      commissionAmount: 120_000, // 50k + 70k
      commissionPercent: 8,
      isCommissionCapped: false,
    });

    // پله ۳ (۱٬۵۰۰٬۰۰۰ تا ۲٬۵۰۰٬۰۰۰ → ۵٪ روی مازاد)
    expect(computeProgressiveCommission(2_000_000)).toMatchObject({
      commissionAmount: 145_000, // 50k + 70k + 25k
      commissionPercent: 7.25,
      isCommissionCapped: false,
    });
    expect(computeProgressiveCommission(2_500_000)).toMatchObject({
      commissionAmount: 170_000, // 50k + 70k + 50k
      commissionPercent: 6.8,
      isCommissionCapped: false,
    });

    // پله ۴ (بالای ۲٬۵۰۰٬۰۰۰ → ۳٪ روی مازاد تا سقف ۲۰۰٬۰۰۰ تومان)
    expect(computeProgressiveCommission(3_000_000)).toMatchObject({
      commissionAmount: 185_000, // 170k + 15k
      commissionPercent: 6.17,
      isCommissionCapped: false,
    });
    expect(computeProgressiveCommission(3_500_000)).toMatchObject({
      commissionAmount: 200_000, // 170k + 30k = 200k
      commissionPercent: 5.71,
      isCommissionCapped: true,
    });

    // خدمت ۴ میلیون و ۶ میلیون تومانی → قفل روی سقف ۲۰۰٬۰۰۰ تومان
    expect(computeProgressiveCommission(4_000_000)).toMatchObject({
      commissionAmount: 200_000,
      commissionPercent: 5,
      isCommissionCapped: true,
    });
    expect(computeProgressiveCommission(6_000_000)).toMatchObject({
      commissionAmount: 200_000,
      commissionPercent: 3.33,
      isCommissionCapped: true,
    });
  });

  it('وقتی خدمت ۴ میلیونی بیعانه ندارد سقف ۲۰۰ هزار تومان اعمال می‌شود و اگر بیعانه ۳۰۰ هزاری داشته باشد کمیسیون فقط روی بیعانه (۳۰ هزار) است', () => {
    const fullOnline = computeDepositAmounts({
      price: 4_000_000,
    });
    expect(fullOnline.totalServicePrice).toBe(4_000_000);
    expect(fullOnline.depositAmount).toBe(4_000_000);
    expect(fullOnline.commissionAmount).toBe(200_000);
    expect(fullOnline.commissionPercent).toBe(5);
    expect(fullOnline.isCommissionCapped).toBe(true);
    expect(fullOnline.remainingInSalon).toBe(0);
    expect(fullOnline.amountToPay).toBe(4_200_000);

    const withDeposit = computeDepositAmounts({
      price: 4_000_000,
      depositPrice: 300_000,
    });
    expect(withDeposit.totalServicePrice).toBe(4_000_000);
    expect(withDeposit.depositAmount).toBe(300_000);
    expect(withDeposit.commissionAmount).toBe(30_000);
    expect(withDeposit.remainingInSalon).toBe(3_700_000);
    expect(withDeposit.amountToPay).toBe(330_000);
  });

  it('در سفارش چندخدمتی کمیسیون پلکانی روی کل مبلغ پرداخت آنلاین نوبت محاسبه می‌شود (شکستن خدمت باعث دور زدن کمیسیون نمی‌شود)', () => {
    const splitOrder = computeOrderPricing([
      { price: 500_000, depositPrice: null },
      { price: 500_000, depositPrice: null },
      { price: 500_000, depositPrice: null },
      { price: 500_000, depositPrice: null },
    ]);
    const singleOrder = computeOrderPricing([
      { price: 2_000_000, depositPrice: null },
    ]);

    expect(splitOrder.depositAmount).toBe(2_000_000);
    expect(splitOrder.commissionAmount).toBe(145_000);
    expect(splitOrder.commissionAmount).toBe(singleOrder.commissionAmount);
    expect(splitOrder.amountToPay).toBe(2_145_000);
  });

  it('از حالت درصد ثابت (flat)، پله‌های سفارشی ادمین و برداشتن سقف پشتیبانی می‌کند', () => {
    const flatResult = computeOrderPricing(
      [
        { price: 500_000, depositPrice: 150_000 },
        { price: 400_000, depositPrice: 100_000 },
      ],
      { commissionMode: 'flat', commissionPercent: 12 },
    );

    expect(flatResult.depositAmount).toBe(250_000);
    expect(flatResult.commissionAmount).toBe(30_000);
    expect(flatResult.amountToPay).toBe(280_000);

    const uncappedCustom = computeOrderPricing([{ price: 4_000_000 }], {
      commissionMode: 'tiered',
      commissionTiers: [
        { upTo: 1_000_000, percent: 8 },
        { upTo: null, percent: 4 },
      ],
      commissionMaxAmount: null,
    });
    // 1M * 8% (80k) + 3M * 4% (120k) = 200k
    expect(uncappedCustom.commissionAmount).toBe(200_000);
    expect(uncappedCustom.isCommissionCapped).toBe(false);
  });

  it('بیعانه هرگز از ارزش خدمت بیشتر نمی‌شود و برای قیمت صفر/نامعتبر صفر برمی‌گرداند', () => {
    const result = computeDepositAmounts({
      price: 100_000,
      depositPrice: 500_000,
    });

    expect(result.depositAmount).toBe(100_000);
    expect(result.commissionAmount).toBe(10_000);
    expect(result.amountToPay).toBe(110_000);
    expect(result.remainingInSalon).toBe(0);

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
