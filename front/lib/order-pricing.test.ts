import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeOrderPricing,
  computeProgressiveCommission,
  formatCommissionLabel,
} from './order-pricing';

describe('front/lib/order-pricing (progressive commission & label)', () => {
  it('پله‌های ۱۰٪، ۷٪، ۵٪ و ۳٪ را با سقف ۲۰۰ هزار تومان دقیقاً منطبق با بک‌اند محاسبه می‌کند', () => {
    assert.equal(computeProgressiveCommission(300_000).commissionAmount, 30_000);
    assert.equal(computeProgressiveCommission(500_000).commissionAmount, 50_000);
    assert.equal(computeProgressiveCommission(1_000_000).commissionAmount, 85_000);
    assert.equal(computeProgressiveCommission(2_000_000).commissionAmount, 145_000);
    assert.equal(computeProgressiveCommission(3_000_000).commissionAmount, 185_000);
    assert.equal(computeProgressiveCommission(4_000_000).commissionAmount, 200_000);
    assert.equal(computeProgressiveCommission(4_000_000).isCommissionCapped, true);
  });

  it('برچسب شفاف فارسی را هم در حالت عادی و هم در حالت رسیدن به سقف تولید می‌کند', () => {
    const fourMillion = computeOrderPricing([{ price: 4_000_000 }]);
    assert.equal(
      formatCommissionLabel(fourMillion, 'کمیسیون سایت'),
      'کمیسیون سایت (۵٪ — سقف ۲۰۰,۰۰۰ تومان)',
    );

    const oneMillion = computeOrderPricing([{ price: 1_000_000 }]);
    assert.equal(
      formatCommissionLabel(oneMillion, 'کمیسیون سایت'),
      'کمیسیون سایت (۸.۵٪ پلکانی)',
    );
  });
});
