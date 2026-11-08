/**
 * lint-staged — فقط فایل‌های staged را بررسی می‌کند.
 *
 * ⚠️ نکتهٔ مهمی که در اجرای واقعی کشف شد:
 * lint-staged دستورها را از **ریشهٔ مخزن** اجرا می‌کند، نه از پوشهٔ اپ.
 * ESLint هم پیکربندی را از `cwd` پیدا می‌کند، نه از محل فایل. نتیجه:
 * `eslint file.ts` از ریشه با «couldn't find eslint.config» شکست می‌خورد.
 * راه‌حل: ابتدا `cd` به پوشهٔ اپ، بعد eslint — همان الگویی که خودِ
 * اسکریپت‌های هر اپ استفاده می‌کنند.
 *
 * `--fix` این‌جا مجاز است چون فایل از قبل staged شده و تغییرِ عمدی کاربر
 * است — برخلاف `pnpm lint` که هرگز نباید بنویسد.
 */
const quote = files => files.map(f => `"${f}"`).join(' ');

export default {
  'apps/api/**/*.ts': filenames =>
    filenames.map(f => `sh -c 'cd apps/api && npx eslint --fix "${f.replace(/^apps\/api\//, '')}"'`),

  'apps/web/**/*.{ts,tsx}': filenames =>
    filenames.map(f => `sh -c 'cd apps/web && npx eslint --fix "${f.replace(/^apps\/web\//, '')}"'`),

  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
