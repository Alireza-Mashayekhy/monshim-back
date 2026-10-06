#!/usr/bin/env node
/**
 * درون‌ریزیِ «CSS بحرانی» در HTML صفحاتِ پررندر‌شده (App Router).
 *
 * ── مسئله ──────────────────────────────────────────────────────────────────
 * Next.js فایل‌های CSS هر entry را با `<link rel="stylesheet">` در `<head>`
 * می‌گذارد. این لینک‌ها روی مسیر render مسدودکننده‌اند (Render-blocking) و
 * مرورگر تا رسیدنِ آن‌ها هیچ چیزی را رنگ نمی‌کند؛ در لایت‌هاوس هم دقیقاً
 * همین به‌عنوان «Render-blocking requests» با تخمین صرفه‌جوییِ چند صد
 * میلی‌ثانیه گزارش می‌شود.
 *
 * راه‌حل‌های داخلی Next برای App Router مناسب نیستند:
 *   • `experimental.optimizeCss` (critters) فقط برای Pages Router کار می‌کند.
 *   • `experimental.inlineCss` کل CSS را داخل تگ `<style>` می‌گذارد، اما در
 *     نسخه‌های فعلی همان متنِ CSS را ۲ تا ۳ بار دیگر داخل RSC payload/segment
 *     هم سریالایز می‌کند (مثلاً در همین پروژه HTMLِ صفحهٔ اصلی از ~۲۶KB به
 *     ~۱۱۰KB gzip می‌رسد). به همین دلیل آن گزینه در `next.config.ts` خاموش است.
 *
 * ── کاری که این اسکریپت می‌کند ─────────────────────────────────────────────
 * بعد از `next build` و روی HTMLهای از پیش رندر‌شدهٔ `.next/server/app`:
 *   1) کلاس‌های به‌کاررفته در خود HTML را استخراج می‌کند.
 *   2) از هر فایل CSSِ لینک‌شده، فقط قواعدی را نگه می‌دارد که «ممکن است» روی
 *      همان صفحه اثر بگذارند (سلکتورهای بدون کلاس مثل `:root`، `@font-face`،
 *      `@keyframes`، `@property`، `html`/`body` همیشه می‌مانند).
 *      این فیلتر «سوپرست» است: یک قاعده تنها زمانی حذف می‌شود که هیچ‌کدام از
 *      کلاس‌هایش در HTML نباشند؛ پس هیچ استایلی از دست نمی‌رود.
 *   3) نتیجه را به‌صورت یک `<style>` در ابتدای `<head>` می‌گذارد تا اولین
 *      رنگ‌آمیزی (FCP/LCP) بدون هیچ درخواستِ مسدودکننده انجام شود.
 *   4) فایل CSS اصلی را با همان URL (برای کش و ناوبری کلاینتی) اما
 *      غیرمسدودکننده نگه می‌دارد: `media="print"` + `onload="this.media='all'"`.
 *      اگر همهٔ قواعد یک فایل داخل HTML رفت، لینکش کامل حذف می‌شود.
 *
 * چون این بازنویسی بعد از تولید HTML انجام می‌شود، متن CSS در RSC payload
 * تکرار نمی‌شود؛ برخلاف `experimental.inlineCss`.
 *
 * ⚠️ پیش‌نیاز: HTMLِ صفحاتی که `◌ (Static)` هستند (پیش‌رندر‌شده‌ها). صفحاتِ
 * SSR/ISR در زمان اجرا ساخته می‌شوند و از این اسکریپت بهره‌ای نمی‌برند.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import postcss from 'postcss';

const DIST_DIR = process.env.NEXT_DIST_DIR ?? '.next';
const HTML_ROOT = path.join(DIST_DIR, 'server', 'app');
const MARKER = 'data-critical-css';
const STRICT = process.env.CRITICAL_CSS_STRICT === '1';

/** همهٔ فایل‌های HTML زیر مسیر داده‌شده. */
function collectHtmlFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** کلاس‌های `class="..."` را از HTML بیرون می‌کشد (entityها را هم باز می‌کند). */
function collectUsedClasses(html) {
  const used = new Set();
  const decode = value =>
    value
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;|&#34;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  for (const m of html.matchAll(/class(?:Name)?="([^"]*)"/g)) {
    for (const token of decode(m[1]).split(/\s+/)) {
      if (token) used.add(token);
    }
  }
  return used;
}

/** کلاس‌های یک سلکتور CSS (با بازکردن escapeهای `\:` و `\/` و ...). */
function selectorClasses(selector) {
  const out = [];
  for (const m of selector.matchAll(/\.((?:[^\s,>+~:[\]()]|\\.)+)/g)) {
    out.push(m[1].replace(/\\(.)/g, '$1'));
  }
  return out;
}

/**
 * یک selector-list را به بخش‌های کاما-جدا می‌شکند، بدون توجه به کاماهای
 * داخل پرانتز/براکت (`:is(a, b)`, `[data-x=","]`).
 */
function splitSelectors(selector) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of selector) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

/**
 * فیلترِ سوپرست: هر قاعده‌ای که هیچ کلاسی در HTML ندارد حذف می‌شود.
 *
 * ⚠️ هر بخش از selector-list جداگانه ارزیابی می‌شود. دلیلش یک تلهٔ واقعی است:
 * LightningCSS دو بلوک `:root` و `.dark` را (چون مقادیرشان یکی است) در یک
 * قاعدهٔ `:root,.dark{--primary:...;--background:...}` ادغام می‌کند. اگر قاعده
 * یک واحد دیده شود، چون `.dark` در HTML نیست کل قاعده حذف می‌شد و در نتیجه
 * **تمام متغیرهای رنگِ سایت** از CSS بحرانی می‌افتادند؛ اولین رنگ‌آمیزی بدون
 * رنگ انجام می‌شد و بعد با رسیدن CSS اصلی، صفحه یک‌باره رنگی می‌شد.
 *
 * at-ruleها (media/supports/layer/container) نگه داشته می‌شوند تا ترتیب
 * لایه‌های CSS (cascade layers) به‌هم نخورد.
 */
function filterCss(css, usedClasses) {
  const root = postcss.parse(css);
  let kept = 0;
  let dropped = 0;

  const visit = container => {
    for (const node of [...(container.nodes ?? [])]) {
      if (node.type === 'atrule' && node.nodes) {
        visit(node);
        continue;
      }
      if (node.type !== 'rule') continue;
      const keep = splitSelectors(node.selector).some(part => {
        const classes = selectorClasses(part);
        return classes.length === 0 || classes.some(c => usedClasses.has(c));
      });
      if (keep) {
        kept++;
      } else {
        dropped++;
        node.remove();
      }
    }
  };
  visit(root);

  return { css: root.toString(), kept, dropped };
}

/** آدرس `/_next/...` را به مسیر فایل روی دیسک تبدیل می‌کند. */
function hrefToFile(href) {
  const marker = '/_next/';
  const index = href.indexOf(marker);
  if (index === -1) return null;
  const relative = href.slice(index + marker.length).split('?')[0];
  return path.join(DIST_DIR, relative);
}

/**
 * لینک‌های `preload` فونت را به ابتدای `<head>` می‌برد.
 *
 * چرا لازم است؟ CSS بحرانیِ درون‌ریزی‌شده (~۵۵ کیلوبایت) در ابتدای `<head>`
 * قرار می‌گیرد و تگ‌های Next (از جمله preload فونت) بعد از آن می‌آیند. مرورگر
 * هرچند با preload-scanner جلوتر از parser را می‌خواند، برای رسیدن به بایتِ
 * ~۵۶KB باید همین حجم را دانلود کند؛ روی شبکهٔ کند موبایل (همان پروفایل
 * PageSpeed) این یعنی شروعِ دانلود فونت چند صد میلی‌ثانیه دیرتر — دقیقاً همان
 * چیزی که در «Network dependency tree» به‌صورت زنجیرهٔ document → woff2 با
 * ۸۹۷ms دیده می‌شود، و هرچه دیرتر باشد پنجرهٔ FOUT/CLS طولانی‌تر می‌شود.
 * با انتقال این تگ به ابتدای head، فونت از همان اولین بایت‌های HTML کشف می‌شود.
 */
function hoistFontPreloads(html) {
  const tags = [...html.matchAll(/<link\b[^>]*\bas="font"[^>]*>/gi)].map(
    match => match[0],
  );
  if (tags.length === 0) return html;
  let out = html;
  for (const tag of tags) out = out.replace(tag, () => '');
  return out.replace(/(<head[^>]*>)/i, (_m, head) => `${head}${tags.join('')}`);
}

/** تبدیل `<link rel="stylesheet">` به لینکی که رندر را مسدود نمی‌کند. */
function makeNonBlocking(tag) {
  const withoutMedia = tag.replace(/\smedia="[^"]*"/g, '');
  return withoutMedia.replace(
    /\s*\/?>$/,
    m => ` media="print" onload="this.media='all'"${m}`,
  );
}

/** همهٔ کلاس‌های به‌کاررفته در سلکتورهای یک CSS (شامل داخل at-ruleها). */
function collectSelectorClasses(css, target) {
  postcss.parse(css).walkRules(rule => {
    for (const c of selectorClasses(rule.selector)) target.add(c);
  });
}

function gzipSize(text) {
  return zlib.gzipSync(text, { level: 9 }).length;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function processFile(file, cache) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARKER)) return { skipped: 'already-processed' };

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].filter(tag =>
    /rel="stylesheet"/i.test(tag[0]),
  );
  if (links.length === 0) return { skipped: 'no-stylesheet' };

  const usedClasses = collectUsedClasses(html);
  const inlineParts = [];
  const keptClassSelectors = new Set();
  const originalClassSelectors = new Set();
  let removedLinks = 0;
  let inlinedFiles = 0;
  let kept = 0;
  let dropped = 0;

  for (const match of links) {
    const tag = match[0];
    const href = /href="([^"]+)"/.exec(tag)?.[1];
    const cssFile = href ? hrefToFile(href) : null;
    if (!cssFile || !fs.existsSync(cssFile)) continue;

    if (!cache.has(cssFile)) {
      cache.set(cssFile, fs.readFileSync(cssFile, 'utf8'));
    }
    const original = cache.get(cssFile);
    const result = filterCss(original, usedClasses);
    collectSelectorClasses(result.css, keptClassSelectors);
    collectSelectorClasses(original, originalClassSelectors);
    inlineParts.push(result.css);
    kept += result.kept;
    dropped += result.dropped;

    // اگر همهٔ قواعد فایل داخل HTML رفت، لینکِ آن فایل دیگر لازم نیست.
    const replacement =
      result.dropped === 0
        ? ''
        : `${makeNonBlocking(tag)}<noscript>${tag}</noscript>`;
    html = html.replace(tag, () => replacement);
    if (result.dropped === 0) inlinedFiles++;
    removedLinks++;
  }

  // اعتبارسنجی: هر کلاسی که در CSS اصلی قاعده دارد و در این صفحه استفاده
  // شده، باید در CSS درون‌ریزی‌شده هم حاضر باشد.
  const missing = [];
  for (const c of originalClassSelectors) {
    if (usedClasses.has(c) && !keptClassSelectors.has(c)) missing.push(c);
  }

  if (inlineParts.length === 0) return { skipped: 'no-local-css' };

  const inlineCss = inlineParts.join('');
  html = html.replace(
    /<head([^>]*)>/i,
    head => `${head}<style ${MARKER}>${inlineCss}</style>`,
  );
  // preload فونت باید قبل از CSS بحرانی (۵۵KB) دیده شود تا دانلودش دیر شروع نشود.
  html = hoistFontPreloads(html);
  fs.writeFileSync(file, html);

  return {
    html,
    kept,
    dropped,
    removedLinks,
    inlinedFiles,
    inlineCss,
    missing,
  };
}

function main() {
  if (!fs.existsSync(HTML_ROOT)) {
    console.log(
      `› inline-critical-css: پوشهٔ ${HTML_ROOT} پیدا نشد؛ رد شد (dev build؟)`,
    );
    return;
  }

  const files = collectHtmlFiles(HTML_ROOT);
  const cache = new Map();
  let processed = 0;
  let totalInlineBytes = 0;
  let totalInlineGzip = 0;
  let totalDroppedBytes = 0;
  const missingClasses = [];

  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    let result;
    try {
      result = processFile(file, cache);
    } catch (error) {
      console.error(`✗ ${path.relative(DIST_DIR, file)}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    if (result.skipped) continue;
    processed++;
    totalInlineBytes += Buffer.byteLength(result.inlineCss);
    totalInlineGzip += gzipSize(result.inlineCss);
    totalDroppedBytes += result.dropped;
    missingClasses.push(...result.missing.map(c => `${path.relative(DIST_DIR, file)} → ${c}`));

    const after = result.html;
    const fullyInlined =
      result.inlinedFiles > 0 ? `، ${result.inlinedFiles} فایل کاملاً حذف شد` : '';
    console.log(
      `✓ ${path.relative(DIST_DIR, file)}  ` +
        `لینک مسدودکننده: ${result.removedLinks} → ۰${fullyInlined}  ` +
        `| CSS درون‌ریزی‌شده: ${formatBytes(Buffer.byteLength(result.inlineCss))} ` +
        `(gzip ${formatBytes(gzipSize(result.inlineCss))})  ` +
        `| قواعد: ${result.kept} نگه‌داشته، ${result.dropped} حذف  ` +
        `| HTML: ${formatBytes(Buffer.byteLength(before))} → ${formatBytes(Buffer.byteLength(after))}`,
    );
  }

  if (processed === 0) {
    console.log('› inline-critical-css: صفحهٔ پررندر‌شده‌ای برای پردازش نبود.');
    return;
  }

  console.log(
    `› inline-critical-css: ${processed} صفحه پردازش شد؛ مجموع CSS درون‌ریزی‌شده ` +
      `${formatBytes(totalInlineBytes)} (gzip ${formatBytes(totalInlineGzip)})، ` +
      `${totalDroppedBytes} قاعدهٔ بی‌استفاده حذف شد.`,
  );

  if (missingClasses.length > 0) {
    const message =
      `✗ ${missingClasses.length} کلاسِ استفاده‌شده در صفحه، بعد از فیلتر در CSS درون‌ریزی‌شده نیست ` +
      `(استایل‌های آن‌ها با فایل CSS غیرمسدودکننده در ادامه می‌رسد):\n` +
      missingClasses.slice(0, 20).join('\n');
    if (STRICT) return void (console.error(message), (process.exitCode = 1));
    console.warn(message);
  }
}

main();
