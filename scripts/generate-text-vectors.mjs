/**
 * بردارهای آزمون «منطق متن فارسی» — ارقام و کد ملی.
 *
 * همین منطق در دو طرف پیاده شده است:
 *   back  : src/common/utils/{digits.util,national-code.util}.ts
 *   front : lib/{digits,national-code}.ts
 *
 * واگرایی این‌جا مستقیماً برای کاربر دیده می‌شود: کدی که در فرم «معتبر»
 * شناخته می‌شود اما سرور رد می‌کند (یا برعکس).
 *
 * اجرای دوباره فقط اگر آگاهانه الگوریتم را عوض کردید:
 *   node --import ./scripts/register-ts-resolver.mjs scripts/generate-text-vectors.mjs
 *
 * چرا `--import` اجباری است (نه اختیاری)؟
 * `national-code.util.ts` این خط را دارد:
 *     import { toEnglishDigits } from './digits.util'    ← بدون پسوند
 * Node به دنبال فایل دقیق `./digits.util` می‌گردد و پیدا نمی‌کند.
 * بدون هوک، این مولد با `ERR_MODULE_NOT_FOUND` شکست می‌خورد.
 * (این باگ واقعاً وجود داشت؛ با اجرای مولد پیدا و رفع شد.)
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const digits = await import(path.join(ROOT, 'apps/api/src/common/utils/digits.util.ts'));
const nc = await import(path.join(ROOT, 'apps/api/src/common/utils/national-code.util.ts'));

const digitInputs = [
  '', '0', '1', '9', '0123456789',
  '۰', '۹', '۰۱۲۳۴۵۶۷۸۹', '٠١٢٣٤٥٦٧٨٩', '۰۹۱۲۳۴۵۶۷۸۹',
  '۱۲۳abc۴۵۶', ' ۱۲۳ ', '۳٫۵', '۱۲,۳۴۵', '0012345678',
  'ك', '۰-۱۲ ۳۴', 'a1b2c3', '۱۰۰۰', '٪۵۰',
];

const nationalInputs = [
  ...digitInputs,
  '0012345678', '1234567890', '۰۰۱۲۳۴۵۶۷۸', '٠٠١٢٣٤٥٦٧٨',
  '3522565017', '۳۵۲۲۵۶۵۰۱۷', '3522565018',
  '352 256 5017', '352-256-5017', '3522565017 ', ' 3522565017',
  '352\u200c256\u200c5017', '352\u200b256\u200b5017',
  'abcdefghij', '352256501', '35225650177', '0000000000', '1111111111',
  '3522565017:1', '+983522565017', null, undefined, 3522565017,
];

const vectors = {
  digits: digitInputs.map(input => ({
    input,
    expect: {
      toEnglish: digits.toEnglishDigits(input),
      normalizeNumeric: digits.normalizeNumericString(input),
    },
  })),
  nationalCode: nationalInputs.map(input => ({
    input: input ?? null,
    expect: {
      normalize: nc.normalizeNationalCode(input),
      isValid: nc.isValidIranianNationalCode(input),
    },
  })),
  persian: digitInputs.map(input => ({ input, expect: nc.toPersianDigits(input) })),
};

const out = path.join(ROOT, 'packages/contracts/vectors/text-vectors.json');
writeFileSync(out, JSON.stringify({ generatedBy: 'scripts/generate-text-vectors.mjs', vectors }, null, 2) + '\n');
console.log(`✓ ${vectors.digits.length} digit + ${vectors.nationalCode.length} national-code + ${vectors.persian.length} persian بردار نوشته شد`);
