/**
 * ثبتِ هوک حل مسیر برای **مولدهای بردار**.
 *
 * چرا لازم است؟
 * `shared/generate-text-vectors.mjs` فایل‌های TypeScript بک‌اند را مستقیم
 * `import` می‌کند (`apps/api/src/common/utils/digits.util.ts`). Node این فایل‌ها
 * را می‌فهمد، اما importهای **بدون پسوند** داخل خودشان را نه:
 *
 *   national-code.util.ts  →  import { toEnglishDigits } from './digits.util'
 *
 * Node به دنبال فایل دقیق `./digits.util` می‌گردد و پیدا نمی‌کند
 * (فایل واقعی `digits.util.ts` است) → `ERR_MODULE_NOT_FOUND`.
 *
 * این هوک همان پسوندها را امتحان می‌کند. **فقط در زمان اجرای مولد** بارگذاری
 * می‌شود و هیچ اثری روی کد Production، باندل Next یا بیلد Nest ندارد.
 *
 * استفاده:
 *   node --import ./shared/register-ts-resolver.mjs shared/generate-text-vectors.mjs
 */
import { register } from 'node:module';
import path from 'node:path';

/** ریشهٔ مخزن — برای اینکه importهای نسبی داخل back/src درست حل شوند. */
export const REPO_ROOT = path.resolve(import.meta.dirname, '..');

register(
  new URL('./ts-extension-resolver.mjs', import.meta.url),
  import.meta.url,
);
