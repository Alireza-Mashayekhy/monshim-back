// @ts-check
/**
 * قواعد ESLint مشترک بین بک‌اند و فرانت.
 *
 * چرا فقط «قواعد» و نه «کل پیکربندی»؟
 * مثل همان درسی که در tsconfig گرفتیم: پیکربندی مشترک باید فقط چیزهای
 * مشترک را داشته باشد. تفاوت‌های واقعی این دو اپ زیاد است:
 *
 *   بک‌اند : type-checked rules، globals.node، sourceType commonjs،
 *            projectService، استثنای require-await در spec‌ها
 *   فرانت  : پلاگین‌های Next/React، globals.browser، JSX
 *
 * اگر همه را یک‌جا ادغام می‌کردیم، باید برای هر اپ ده‌ها استثنا می‌گذاشتیم
 * که نتیجه‌اش پیکربندی گیج‌کننده‌تر از قبل بود. پس فقط قواعدی که
 * **واقعاً یکسان‌اند** این‌جا هستند و هر اپ بقیه را خودش اضافه می‌کند.
 */
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

/** پلاگین‌هایی که هر دو اپ استفاده می‌کنند. */
export const sharedPlugins = {
  'simple-import-sort': simpleImportSort,
  'unused-imports': unusedImports,
};

/**
 * قواعد یکسان در هر دو اپ.
 *
 * ⚠️ `prettier/prettier` عمداً این‌جا نیست: فرانت از پلاگین prettier در
 * ESLint استفاده نمی‌کند (فقط بک‌اند). این در اجرای واقعی کشف شد — افزودنش
 * باعث خطای «The "prettier" plugin is not defined» در فرانت شد.
 */
export const sharedRules = {
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    },
  ],
};

/**
 * استثنای هدفمند فایل‌های تست.
 *
 * دابل‌های تست (repo mock) باید امضای TypeORM را حفظ کنند که `Promise`
 * برمی‌گرداند. تابع `async` که فقط `return value` دارد خواناترین شکل است؛
 * تبدیلش به `() => Promise.resolve(...)` سودی ندارد.
 * فقط `*.spec.ts` / `*.test.ts` — کد Production همچنان `await` واقعی
 * می‌خواهد.
 */
export const testFileOverrides = {
  files: ['**/*.spec.ts', '**/*.test.ts'],
  rules: {
    '@typescript-eslint/require-await': 'off',
  },
};

export default { sharedPlugins, sharedRules, testFileOverrides };
