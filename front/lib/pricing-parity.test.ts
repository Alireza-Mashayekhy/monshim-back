import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  computeOrderPricing,
  computeProgressiveCommission,
  computeServicePricing,
  normalizeCommissionTiers,
} from './order-pricing.ts';

/**
 * «قفل همسانی» منطق پول — سمت فرانت.
 *
 * همین بردارها در `back/src/payment/pricing-parity.spec.ts` هم اجرا می‌شوند.
 * اگر پیاده‌سازی فرانت از بک‌اند منحرف شود، این تست می‌شکند.
 *
 * جزئیات طراحی در همان فایل بک‌اند توضیح داده شده است.
 */
type Vector = {
  kind: 'tiers' | 'progressive' | 'service' | 'order';
  label: string;
  input: unknown;
  expect: unknown;
};

/** `front/lib` → `front` → ریشهٔ مخزن؛ بردارها در `shared/` ریشه هستند. */
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

const { vectors: allVectors } = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'shared', 'pricing-vectors.json'), 'utf8'),
) as { vectors: Vector[] };

const byKind = (kind: Vector['kind']) => allVectors.filter(v => v.kind === kind);

describe('قفل همسانی قیمت‌گذاری — همان بردارهای بک‌اند', () => {
  it('فایل بردارها کامل است', () => {
    assert.ok(allVectors.length > 500, `بردارها: ${allVectors.length}`);
    assert.ok(byKind('progressive').length > 100);
    assert.ok(byKind('service').length > 100);
    assert.ok(byKind('order').length > 50);
  });

  it('نرمال‌سازی پله‌های کمیسیون دقیقاً منطبق است', () => {
    for (const v of byKind('tiers')) {
      assert.deepEqual(
        normalizeCommissionTiers(v.input as never),
        v.expect,
        `انحراف در: ${v.label}`,
      );
    }
  });

  it('کمیسیون پلکانی دقیقاً منطبق است', () => {
    for (const v of byKind('progressive')) {
      const { amount, options } = v.input as { amount: number; options: never };
      assert.deepEqual(
        computeProgressiveCommission(amount, options),
        v.expect,
        `انحراف در: ${v.label}`,
      );
    }
  });

  it('قیمت‌گذاری یک خدمت دقیقاً منطبق است', () => {
    for (const v of byKind('service')) {
      assert.deepEqual(
        computeServicePricing(v.input as never),
        v.expect,
        `انحراف در: ${v.label}`,
      );
    }
  });

  it('قیمت‌گذاری سفارش چند-خدمتی دقیقاً منطبق است', () => {
    for (const v of byKind('order')) {
      const { services, options } = v.input as {
        services: never;
        options: never;
      };
      assert.deepEqual(
        computeOrderPricing(services, options),
        v.expect,
        `انحراف در: ${v.label}`,
      );
    }
  });
});
