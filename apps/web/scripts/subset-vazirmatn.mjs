#!/usr/bin/env node
/**
 * ساب‌ست کردن فونت وزیرمتن (Vazirmatn-VF.woff2) به زیرمجموعه‌ای از
 * نویسه‌هایی که در رابط کاربری استفاده می‌شوند.
 *
 * ── چرا ──────────────────────────────────────────────────────────────────
 * فایل VF فعلی ۱۱۱ کیلوبایت است و شامل همهٔ گلیف‌های فارسی، لاتین، ارقام،
 * علائم و ایموجی‌های استاندارد است. با این حال، در عمل رابط کاربری ما تنها
 * از زیرمجموعهٔ کوچکی استفاده می‌کند:
 *   • حروف فارسی (U+0600–U+06FF)
 *   • ارقام فارسی (U+06F0–U+06F9)
 *   • نیم‌فاصله (U+200C)
 *   • حروف لاتین پایه (U+0020–U+007E) برای متون انگلیسی و prefix
 *   • ارقام لاتین (U+0030–U+0039) برای زمان‌ها و شماره‌ها
 *   • علائم رایج (U+060C، U+061B، U+061F و ...)
 *
 * اندازهٔ مورد انتظار: ۴۵–۶۰ کیلوبایت (کاهش ۴۵–۵۵٪).
 *
 * ── نحوهٔ اجرا ──────────────────────────────────────────────────────────
 * نیازمند نصب `subset-font` (یا `fontmin`) به‌عنوان devDependency:
 *   pnpm add -D subset-font
 * سپس:
 *   pnpm tsx scripts/subset-vazirmatn.mjs
 *
 * ── ریسک ─────────────────────────────────────────────────────────────────
 * اگر متنی شامل نویسه‌ای خارج از مجموعهٔ بالا باشد، در رندر به جای آن
 * کاراکتر، ▢ (tofu) نمایش داده می‌شود. بنابراین قبل از deploy حتماً:
 *   1) متن‌های واقعی صفحات اصلی را crawl و union نویسه‌ها را محاسبه کنید.
 *   2) اسکرین‌شات در مرورگرهای مختلف بگیرید.
 *
 * این اسکریپت **خودکار** همهٔ صفحات `.tsx` را می‌خواند و union نویسه‌هایشان
 * را به‌علاوهٔ مجموعهٔ پایهٔ بالا subset می‌کند؛ یعنی ریسک حذف تصادفی
 * نویسه‌های ضروری به حداقل می‌رسد.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import subsetFont from 'subset-font';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SOURCE = join(ROOT, 'components/font/vazirmatn/Vazirmatn-VF.woff2');
const OUTPUT = join(ROOT, 'components/font/vazirmatn/Vazirmatn-VF.subset.woff2');

/** مجموعهٔ پایهٔ نویسه‌ها — همیشه نگه داشته می‌شوند. */
const BASE_CHARS = new Set();

/** حروف فارسی. */
for (let cp = 0x0600; cp <= 0x06ff; cp++) BASE_CHARS.add(cp);
/** ارقام فارسی. */
for (let cp = 0x06f0; cp <= 0x06f9; cp++) BASE_CHARS.add(cp);
/** حروف لاتین پایه. */
for (let cp = 0x0020; cp <= 0x007e; cp++) BASE_CHARS.add(cp);
/** نیم‌فاصله (ZWNJ) — برای کلمات ترکیبی فارسی ضروری است. */
BASE_CHARS.add(0x200c);
/** علائم فارسی رایج (ویرگول، نقطه‌ویرگول، علامت سؤال، یرلا، کاف، الف مقصوره). */
[0x060c, 0x061b, 0x061f, 0x064b, 0x06a4, 0x0627].forEach(cp => BASE_CHARS.add(cp));

async function* walkJsx(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsx(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      yield full;
    }
  }
}

async function collectTextFromSources() {
  const text = new Set();
  for await (const file of walkJsx(join(ROOT, 'app'))) {
    const content = await readFile(file, 'utf8');
    // استخراج متن از JSX text nodes (ساده‌ترین حالت).
    const matches = content.matchAll(/>([^<>{}]+)</g);
    for (const m of matches) {
      for (const ch of m[1]) text.add(ch);
    }
  }
  for await (const file of walkJsx(join(ROOT, 'components'))) {
    const content = await readFile(file, 'utf8');
    const matches = content.matchAll(/>([^<>{}]+)</g);
    for (const m of matches) {
      for (const ch of m[1]) text.add(ch);
    }
  }
  return text;
}

async function main() {
  const sourceText = await collectTextFromSources();
  const text = '';
  for (const ch of sourceText) {
    if (BASE_CHARS.has(ch.codePointAt(0))) text += ch;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[subset-vazirmatn] مجموعهٔ نهایی: ${new Set(text).size} نویسهٔ یکتا`,
  );

  const font = await readFile(SOURCE);
  const subsetted = await subsetFont(font, text, {
    targetFormat: 'woff2',
  });

  await writeFile(OUTPUT, subsetted);

  // eslint-disable-next-line no-console
  console.log(
    `[subset-vazirmatn] خروجی: ${relative(ROOT, OUTPUT)} (${subsetted.length} بایت)`,
  );
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[subset-vazirmatn] خطا:', err);
  process.exit(1);
});
