/**
 * ثبتِ هوک حل مسیر برای اجرای تست‌ها.
 *
 * `tests/ts-resolve.mjs` خودِ هوک را صادر می‌کند، اما Node تا وقتی
 * `register()` صدا زده نشود آن را فعال نمی‌کند. این فایل همان کار را می‌کند.
 *
 * استفاده:
 *   node --import ./tests/register-resolver.mjs --test lib/digits.test.ts
 */
import { register } from 'node:module';

register('./ts-resolve.mjs', import.meta.url);
