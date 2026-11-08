import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  computeOrderPricing,
  computeProgressiveCommission,
  computeServicePricing,
  normalizeCommissionTiers,
} from './deposit-amount';

/**
 * «قفل همسانی» منطق پول.
 *
 * مسئلهٔ واقعی: قیمت‌گذاری و کمیسیون در دو جا پیاده‌سازی شده است —
 * `back/src/payment/deposit-amount.ts` و `front/lib/order-pricing.ts`.
 * اگر یکی تغییر کند و دیگری نه، مشتری در صفحه یک مبلغ می‌بیند و
 * در درگاه مبلغ دیگری پرداخت می‌کند. این یک خطای مالی است، نه UI.
 *
 * راه‌حل: فایل `shared/pricing-vectors.json` مجموعهٔ ثابتی از
 * ورودی‌ها و خروجی‌های «مرجع» است. بک‌اند و فرانت **هر دو** همین
 * بردارها را اجرا می‌کنند. هر انحرافی از هر طرف، تست را می‌شکند.
 *
 * چرا این بهتر از انتقال کد به یک پکیج مشترک است؟
 *  - هیچ مسیر Build یا Deploy عوض نمی‌شود (ریسک صفر برای Production)
 *  - هر پروژه پیاده‌سازی بومی و خوانای خودش را نگه می‌دارد
 *  - همان تضمین را می‌دهد: دو نسخه نمی‌توانند بی‌صدا واگرا شوند
 *
 * اگر آگاهانه الگوریتم را عوض کردید، بردارها را بازتولید کنید:
 *   node shared/generate-pricing-vectors.mjs
 */
type Vector = {
  kind: 'tiers' | 'progressive' | 'service' | 'order';
  label: string;
  input: unknown;
  expect: unknown;
};

/**
 * بردارها با `fs` خوانده می‌شوند نه `import`:
 *  - `import ... with { type: 'json' }` در خروجی CommonJS مجاز نیست
 *  - `resolveJsonModule` در tsconfig بک‌اند روشن نیست
 * این هم ساده‌تر است و هم هیچ تنظیم Build را عوض نمی‌کند.
 */
const VECTORS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'shared',
  'pricing-vectors.json',
);

const { vectors: allVectors } = JSON.parse(
  readFileSync(VECTORS_PATH, 'utf8'),
) as { vectors: Vector[] };

const byKind = (kind: Vector['kind']) =>
  allVectors.filter(vector => vector.kind === kind);

describe('قفل همسانی قیمت‌گذاری — بردارهای مشترک با فرانت', () => {
  it('فایل بردارها خالی یا ناقص نیست', () => {
    expect(allVectors.length).toBeGreaterThan(500);
    expect(byKind('progressive').length).toBeGreaterThan(100);
    expect(byKind('service').length).toBeGreaterThan(100);
    expect(byKind('order').length).toBeGreaterThan(50);
  });

  it('نرمال‌سازی پله‌های کمیسیون دقیقاً منطبق است', () => {
    for (const vector of byKind('tiers')) {
      expect({
        label: vector.label,
        out: normalizeCommissionTiers(vector.input as never),
      }).toEqual({ label: vector.label, out: vector.expect });
    }
  });

  it('کمیسیون پلکانی دقیقاً منطبق است', () => {
    for (const vector of byKind('progressive')) {
      const { amount, options } = vector.input as {
        amount: number;
        options: never;
      };
      expect({
        label: vector.label,
        out: computeProgressiveCommission(amount, options),
      }).toEqual({ label: vector.label, out: vector.expect });
    }
  });

  it('قیمت‌گذاری یک خدمت دقیقاً منطبق است', () => {
    for (const vector of byKind('service')) {
      expect({
        label: vector.label,
        out: computeServicePricing(vector.input as never),
      }).toEqual({ label: vector.label, out: vector.expect });
    }
  });

  it('قیمت‌گذاری سفارش چند-خدمتی دقیقاً منطبق است', () => {
    for (const vector of byKind('order')) {
      const { services, options } = vector.input as {
        services: never;
        options: never;
      };
      expect({
        label: vector.label,
        out: computeOrderPricing(services, options),
      }).toEqual({ label: vector.label, out: vector.expect });
    }
  });
});
