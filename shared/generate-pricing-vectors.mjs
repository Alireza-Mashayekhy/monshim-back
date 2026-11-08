/**
 * سازندهٔ «بردارهای آزمون» قیمت‌گذاری.
 *
 * چرا این فایل وجود دارد؟
 * منطق قیمت‌گذاری/کمیسیون در دو جا زندگی می‌کند (بک‌اند و فرانت) و
 * **باید** خروجی یکسان بدهد. اگر روزی یکی تغییر کند و دیگری نه،
 * مشتری مبلغی می‌بیند و مبلغ دیگری پرداخت می‌شود.
 *
 * این اسکریپت یک مجموعهٔ ثابت از ورودی‌ها می‌سازد و خروجی «مرجع» را
 * با پیاده‌سازی بک‌اند تولید می‌کند. سپس:
 *   - تست فرانت همان بردارها را روی پیاده‌سازی فرانت اجرا می‌کند
 *   - تست بک‌اند همان بردارها را روی پیاده‌سازی بک‌اند اجرا می‌کند
 * اگر هر کدام از مسیر منحرف شود، تست خودش شکست می‌خورد.
 *
 * اجرای دوباره (فقط اگر آگاهانه الگوریتم را عوض کردید):
 *   node --import ./shared/register-ts-resolver.mjs shared/generate-pricing-vectors.mjs
 *
 * دربارهٔ `--import`: مولد، فایل TypeScript بک‌اند را مستقیم import می‌کند.
 * اگر روزی داخل `deposit-amount.ts` یک import **بدون پسوند** اضافه شود
 * (مثل `from './digits.util'`)، Node بدون این هوک `ERR_MODULE_NOT_FOUND`
 * می‌دهد. الان چنین importی وجود ندارد، اما هوک جلوی شکنندگی آینده را می‌گیرد
 * و هزینه‌اش صفر است.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { computeProgressiveCommission, computeServicePricing, computeOrderPricing, normalizeCommissionTiers } =
  await import(path.join(ROOT, 'back/src/payment/deposit-amount.ts'));

const money = [0, 1, 100, 999, 1_000, 50_000, 100_000, 200_000, 300_000, 500_000, 500_001,
  900_000, 1_500_000, 1_500_001, 2_500_000, 2_500_001, 3_000_000, 4_000_000, 10_000_000,
  123_456, 777_777, 1_234_567, -1, -50_000, 0.5, 99.99];

const tierSets = [
  undefined, null, '', '   ', '[]', '{}', 'not-json',
  JSON.stringify([{ upTo: 500_000, percent: 10 }, { upTo: 1_500_000, percent: 7 }, { upTo: null, percent: 5 }]),
  JSON.stringify([{ upTo: 500_000, percent: 10 }]),
  JSON.stringify([{ upTo: null, percent: 12 }]),
  JSON.stringify([{ upTo: 500_000, percent: 10 }, { upTo: 500_000, percent: 20 }]),
  [{ upTo: 1_000, percent: 0 }, { upTo: null, percent: 100 }],
  [{ upTo: 500_000, percent: -5 }, { upTo: 85_000.7, percent: 9.5 }],
  [{ upTo: 0, percent: 10 }, { upTo: null, percent: 5 }],
];

const options = [
  undefined, null, {},
  { commissionMode: 'tiered' },
  { commissionMode: 'flat' },
  { commissionMode: 'flat', commissionPercent: 7 },
  { commissionMode: 'flat', commissionPercent: '12.5' },
  { commissionMode: 'flat', commissionPercent: null },
  { commissionMaxAmount: null },
  { commissionMaxAmount: '' },
  { commissionMaxAmount: 0 },
  { commissionMaxAmount: 50_000 },
  { commissionMaxAmount: '150000' },
  { commissionMode: 'flat', commissionPercent: 150 },
  { commissionMode: 'flat', commissionPercent: -3 },
  { commissionTiers: JSON.stringify([{ upTo: 300_000, percent: 20 }, { upTo: null, percent: 4 }]) },
];

const deposits = [undefined, null, '', 0, -5, 1, 50_000, 100_000, 500_000, 9_999_999, '300000'];

const vectors = [];

// ۱. نرمال‌سازی پله‌ها
for (const t of tierSets) {
  vectors.push({ kind: 'tiers', label: `tiers:${JSON.stringify(t)}`, input: t, expect: normalizeCommissionTiers(t) });
}

// ۲. کمیسیون پلکانی روی شبکهٔ کامل (مبلغ × گزینه‌ها)
for (const amount of money) {
  for (const opt of options) {
    vectors.push({
      kind: 'progressive',
      label: `progressive:${amount}:${JSON.stringify(opt)}`,
      input: { amount, options: opt },
      expect: computeProgressiveCommission(amount, opt),
    });
  }
}

// ۳. قیمت‌گذاری یک خدمت
for (const price of money) {
  for (const depositPrice of deposits) {
    const input = { price, depositPrice };
    vectors.push({ kind: 'service', label: `service:${JSON.stringify(input)}`, input, expect: computeServicePricing(input) });
  }
}

// ۴. قیمت‌گذاری سفارش چند-خدمتی
const baskets = [
  [{ price: 300_000 }],
  [{ price: 300_000, depositPrice: 100_000 }],
  [{ price: 300_000, depositPrice: 100_000 }, { price: 500_000, depositPrice: 200_000 }],
  [{ price: 1_500_000, depositPrice: 500_000 }, { price: 2_500_000, depositPrice: 1_000_000 }, { price: 800_000 }],
  [{ price: 0 }, { price: 0 }],
  [{ price: '450000', depositPrice: '150000' }],
  [{ price: 4_000_000 }, { price: 4_000_000 }],
];
for (const basket of baskets) {
  for (const opt of options) {
    vectors.push({
      kind: 'order',
      label: `order:${JSON.stringify(basket)}:${JSON.stringify(opt)}`,
      input: { services: basket, options: opt },
      expect: computeOrderPricing(basket, opt),
    });
  }
}

const out = path.join(ROOT, 'shared/pricing-vectors.json');
writeFileSync(out, JSON.stringify({ generatedBy: 'shared/generate-pricing-vectors.mjs', count: vectors.length, vectors }, null, 2) + '\n');
console.log(`✓ ${vectors.length} بردار در ${path.relative(ROOT, out)} نوشته شد`);
