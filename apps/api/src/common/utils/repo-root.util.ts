/**
 * پیدا کردن ریشهٔ مخزن و مسیر بردارهای آزمون.
 *
 * چرا این‌طور نوشته شده؟
 * نسخهٔ قبلی از `path.resolve(__dirname, '../../..')` استفاده می‌کرد — یعنی
 * «سه پوشه بالاتر». این با هر جابه‌جایی می‌شکند:
 *
 *   back/src/payment/            → ../../..  = ریشهٔ مخزن  ✅
 *   apps/api/src/payment/        → ../../..  = apps/       ❌
 *
 * آزمون واقعی این را نشان داد: پس از انتقال به monorepo، تست با
 * `ENOENT: /apps/shared/pricing-vectors.json` شکست خورد.
 *
 * راه‌حل: به‌جای شمارش پوشه، از پوشهٔ فعلی **بالا می‌رویم** تا ریشهٔ مخزن
 * را پیدا کنیم (پوشه‌ای که هم `pnpm-workspace.yaml` یا `.git` دارد).
 * این با monorepo، با ساختار فعلی، و با هر ساختار آینده کار می‌کند.
 *
 * ⚠️ این فایل فقط در تست‌ها استفاده می‌شود و هیچ اثری روی Production ندارد.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * ریشهٔ مخزن را با بالا رفتن از پوشهٔ جاری پیدا می‌کند.
 *
 * نشانه‌های ریشه به ترتیب اولویت:
 *   ۱. `pnpm-workspace.yaml` (monorepo)
 *   ۲. `.git` (چک‌اوت عادی)
 */
export function findRepoRoot(startDir: string = __dirname): string {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    if (existsSync(path.join(current, '.git'))) return current;
    if (current === root) break;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // آخرین تلاش: از `cwd` هم امتحان کن (وقتی تست از ریشه اجرا شود)
  const fromCwd = path.resolve(process.cwd());
  return fromCwd;
}

/** مسیر مطلق یک فایل داخل `shared/` ریشهٔ مخزن. */
export function sharedPath(...segments: string[]): string {
  return path.join(findRepoRoot(), 'shared', ...segments);
}

/** خواندن و پارس کردن یک فایل JSON از `shared/`. */
export function readSharedJson<T>(filename: string): T {
  const filePath = sharedPath(filename);
  if (!existsSync(filePath)) {
    throw new Error(
      `فایل بردارها پیدا نشد: ${filePath}\n` +
        `ریشهٔ شناسایی‌شده: ${findRepoRoot()}\n` +
        'اگر ساختار پروژه را جابه‌جا کرده‌اید، `shared/` باید در ریشهٔ مخزن بماند.',
    );
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}
