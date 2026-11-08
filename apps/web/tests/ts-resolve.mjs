/**
 * هوک حل مسیر برای اجرای تست‌ها با `node --test`.
 *
 * چرا لازم است؟
 * بعضی ماژول‌های `lib/` از دو چیز استفاده می‌کنند که Node به‌تنهایی نمی‌فهمد:
 *   ۱. الیاس `@/...` (که فقط Next و tsc آن را می‌شناسند)
 *   ۲. import بدون پسوند (مثل `from './digits'`)
 *
 * این فایل فقط در زمان **تست** بارگذاری می‌شود و هیچ اثری روی کد
 * Production یا باندل Next ندارد. هیچ وابستگی جدیدی هم اضافه نمی‌کند.
 *
 * استفاده:
 *   node --import ./tests/ts-resolve.mjs --test lib/digits.test.ts
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** ریشهٔ پروژهٔ فرانت (`front/`) — همان‌جایی که `paths: { "@/*": ["./*"] }` به آن اشاره دارد. */
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

/** پسوندهایی که به ترتیب امتحان می‌شوند (دقیقاً مثل رفتار `moduleResolution: bundler`). */
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs'];

/**
 * یک specifier را به لیست مسیرهای مطلق کاندید تبدیل می‌کند.
 * اگر specifier نسبی باشد، نسبت به فایل مبدأ حل می‌شود.
 */
function toCandidates(specifier, parentUrl) {
  let base;

  if (specifier.startsWith('@/')) {
    base = path.join(PROJECT_ROOT, specifier.slice(2));
  } else if (specifier.startsWith('.') && parentUrl?.startsWith('file:')) {
    base = path.resolve(path.dirname(new URL(parentUrl).pathname), specifier);
  } else {
    return [];
  }

  const candidates = [];
  const hasExtension = EXTENSIONS.some(ext => base.endsWith(ext));

  if (hasExtension) candidates.push(base);

  for (const ext of EXTENSIONS) candidates.push(base + ext);
  for (const ext of EXTENSIONS) candidates.push(path.join(base, 'index' + ext));

  return candidates.map(candidate => pathToFileURL(candidate).href);
}

export async function resolve(specifier, context, nextResolve) {
  // ابتدا رفتار عادی Node (پکیج‌ها، مسیرهای مطلق و ...)
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;

    for (const candidate of toCandidates(specifier, context.parentURL)) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // کاندید بعدی
      }
    }

    throw error;
  }
}
