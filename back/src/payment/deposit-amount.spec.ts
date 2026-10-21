import { computeDepositAmounts } from './deposit-amount';

/**
 * تست قاعدهٔ مبلغ لینک بیعانه.
 * پیش از این لینک بیعانه کمیسیون سایت را از مشتری نمی‌گرفت؛ نتیجه این بود که
 * رزرو از طریق لینک بیعانه ارزان‌تر از رزرو آنلاین تمام می‌شد.
 */
describe('computeDepositAmounts', () => {
  it('با درصد بیعانه، کمیسیون ۱۰٪ ارزش خدمت را اضافه می‌کند', () => {
    const result = computeDepositAmounts({
      price: 1_000_000,
      depositPercent: 30,
    });

    expect(result.depositAmount).toBe(300_000);
    expect(result.commissionAmount).toBe(100_000);
    expect(result.amountToPay).toBe(400_000);
  });

  it('مبلغ بیعانهٔ ثابت خدمت را بر درصد سایت ترجیح می‌دهد', () => {
    const result = computeDepositAmounts({
      price: 500_000,
      depositPrice: 120_000,
      depositPercent: 30,
    });

    expect(result.depositAmount).toBe(120_000);
    expect(result.commissionAmount).toBe(50_000);
    expect(result.amountToPay).toBe(170_000);
  });

  it('بیعانه را برای قیمت‌های اعشاری گرد می‌کند', () => {
    const result = computeDepositAmounts({
      price: '333333.33',
      depositPercent: 30,
    });

    expect(result.depositAmount).toBe(100_000);
    expect(result.commissionAmount).toBe(33_333);
    expect(result.amountToPay).toBe(133_333);
  });

  it('بیعانه هرگز از ارزش خدمت بیشتر نمی‌شود', () => {
    const result = computeDepositAmounts({
      price: 100_000,
      depositPrice: 500_000,
    });

    expect(result.depositAmount).toBe(100_000);
  });

  it('برای قیمت صفر یا نامعتبر، مبلغ صفر برمی‌گرداند', () => {
    expect(computeDepositAmounts({ price: 0 }).amountToPay).toBe(0);
    expect(computeDepositAmounts({ price: 'abc' }).amountToPay).toBe(0);
  });
});
