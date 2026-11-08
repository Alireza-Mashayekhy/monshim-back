/**
 * خواندن بردارهای آزمون از `shared/` — مقاوم به جابه‌جایی ساختار.
 *
 * چرا نسخهٔ قبلی می‌شکست؟
 *   const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
 * یعنی «دو پوشه بالاتر». این با ساختار قبلی درست بود:
 *   front/lib → front → ریشه ✅
 * ولی پس از انتقال به monorepo:
 *   apps/web/lib → apps/web → apps ❌  (shared در ریشه است، نه در apps)
 *
 * آزمون واقعی این را گرفت: ENOENT: /apps/shared/pricing-vectors.json
 *
 * راه‌حل: از پوشهٔ فعلی بالا می‌رویم تا ریشهٔ مخزن را پیدا کنیم.
 * هیچ شمارش پوشه‌ای در کار نیست، پس با هر ساختاری کار می‌کند.
 *
 * ⚠️ فقط در تست استفاده می‌شود؛ اثر صفر روی باندل Next و Production.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** ریشهٔ مخزن را با بالا رفتن پیدا می‌کند (`pnpm-workspace.yaml` یا `.git`). */
export function findRepoRoot(startDir = import.meta.dirname) {
  let current = path.resolve(startDir);
  const { root } = path.parse(current);

  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    if (existsSync(path.join(current, '.git'))) return current;

    const parent = path.dirname(current);
    if (parent === current || current === root) break;
    current = parent;
  }

  return path.resolve(process.cwd());
}

/** خواندن و پارس کردن یک فایل JSON از `shared/` با پیام خطای گویا. */
export function readSharedJson(filename, startDir) {
  const filePath = path.join(findRepoRoot(startDir), 'packages/contracts/vectors', filename);

  if (!existsSync(filePath)) {
    throw new Error(
      `فایل بردارها پیدا نشد: ${filePath}\n` +
        'packages/contracts/vectors باید در ریشهٔ مخزن باشد (کنار pnpm-workspace.yaml).',
    );
  }

  return JSON.parse(readFileSync(filePath, 'utf8'));
}
