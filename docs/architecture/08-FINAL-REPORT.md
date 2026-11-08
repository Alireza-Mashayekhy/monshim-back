# گزارش نهایی — بازسازی ساختار Monshim

**تاریخ:** ۲۰۲۶-۱۱-۰۸
**شاخه:** `arena/bd03e7a3-monshim` · ۹ کامیت · همه push شده
**PR:** [#46](https://github.com/Alireza-Mashayekhy/monshim/pull/46) — `MERGEABLE` / `CLEAN`
**مبنا:** `main` (`167a89f`)

> **قاعده‌ای که این سند را می‌سازد:** هر عددی که این‌جا نوشته شده، **اجرا شده است**.
> هر چیزی که قابل اجرا نبود در بخش ۱۲ آمده و **به‌عنوان پاس ثبت نشده**.

---

## ۱. معماری اولیه

دو اپلیکیشن مستقل در یک مخزن، بدون هیچ لایهٔ مشترک:

```
/back     NestJS 11 + TypeORM + MySQL + Redis     207 فایل TS (۲۷٬۳۶۲ خط)
/front    Next.js 16 (App Router) + Tailwind 4     ۳۳۶ فایل TS/TSX
/shared   — وجود نداشت
```

| مورد | وضعیت اولیه |
|---|---|
| Package manager | `pnpm` در back، `npm` در front |
| پکیج مشترک | **نداشت** — منطق قیمت‌گذاری در دو جا کپی شده بود |
| Alias | `src/…` (بک‌اند)، `@/…` (فرانت) |
| `tsc` | back **۱ خطا** |
| `eslint` | back **۳۰ خطا**، front **۱۳ خطا** |
| lint script | `lint` = `eslint --fix` → **هر lint فایل‌ها را بی‌صدا بازنویسی می‌کرد** |
| تست back | ۳۲۵ |
| تست front | ۳۲ اجرا می‌شد، **۵۴ تست خاموش** |
| فایل مرده | ۳۰ فایل بدون هیچ import |
| `dockerfile` | حرف کوچک — روی Linux بیلد **می‌شکست** |
| MySQL/Redis | پورت روی **اینترنت باز** |
| shutdown hook | **نداشت** — `pm2 restart` با SIGKILL |

**مشکل ریشه‌ای:** منطق پول (قیمت‌گذاری/محاسبهٔ بیعانه) در دو نقطه زندگی می‌کرد
و هیچ قفلی نبود که اگر یکی از دیگری منحرف شد، چیزی بشکند.

---

## ۲. معماری نهایی

```
/back     NestJS 11          + src/health/  + src/common/utils/upload-path.util.ts
/front    Next.js 16
/shared   ★ جدید — بردارهای مرجع (JSON) + اسکریپت تولیدشان
/docs/architecture/  ★ جدید — ۸ سند
```

**تصمیم کلیدی: monorepo ساخته نشد** — با آزمایش واقعی رد شد (بند ۱۲).
به‌جای تغییر ساختار پرخطر، هدف واقعی (یکتایی منطق) با `<shared/>` **بدون هیچ ریسک** محقق شد.

| مورد | وضعیت نهایی |
|---|---|
| `tsc` | **۰** / **۰** |
| `eslint` | **۰** / **۰ خطا** |
| تست | **۳۵۲** پاس (+۳ skip) / **۵۴** پاس |
| lint script | `lint` و `lint:fix` **جدا شدند** |
| چرخهٔ import | **۳** (همه از قبل، ۰ جدید) |
| اندپوینت | **۱۴۱ → ۱۴۱** (+۲ health) |

---

## ۳. تفاوت ساختاری (اندازه‌گیری‌شده)

```
103 files changed, 22228 insertions(+), 2216 deletions(-)

31 A   (added)
31 D   (deleted)
41 M   (modified)
```

| سنجه | `main` | نهایی | Δ |
|---|---|---|---|
| فایل TS بک‌اند | ۲۱۱ | ۲۰۷ | −۴ |
| یال import | ۳۴۱ | ۳۴۱ | ۰ |
| گروه چرخه‌ای | ۳ | ۳ | **۰** |
| مسیر mount‌شدهٔ API | ۱۴۱ | ۱۴۳ | +۲ (health) |
| وابستگی بک‌اند | ۵۸ | ۵۵ | −۳ |
| وابستگی فرانت | ۵۷ | ۵۷ | ۰ |
| تست بک‌اند | ۳۲۵ | ۳۵۵ | **+۳۰** |
| تست فرانت (اجرا) | ۳۲ | ۵۴ | **+۲۲** |

---

## ۴. فایل‌های حذف‌شده (۳۱ مورد، با دلیل)

### الف) کد مرده — فاز ۱ (۳۰ فایل)

حذف با **اسکن گراف واقعی import** انجام شد، نه با حدس. اسکنر
`next/dynamic`، barrelها و importهای رشته‌ای را هم می‌دید.

**بک‌اند (۷ فایل):**

| فایل | چرا مرده بود |
|---|---|
| `src/notification/*` (۵ فایل) | **هیچ‌وقت mount نشد** — module هیچ `controllers` نداشت |
| `src/auth/dto/reset-password.dto.ts` | صفر import |
| `src/barber/dto/create-barber.dto.ts` | صفر import |
| `src/settings/dto/create-setting.dto.ts` | صفر import |

**فرانت (۲۳ فایل):** کامپوننت‌های orphan شامل ۵ کامپوننت `ui/`
(`card`, `avatar`, `accordion`, `scroll-area`)، ۴ کامپوننت layout/marketing،
۳ کامپوننت profile، و `constants/index.tsx`.

### ب) تغییر نام (نه حذف)

| قبل | بعد | چرا |
|---|---|---|
| `back/dockerfile` | `back/Dockerfile` | **باگ واقعی production** — `compose` می‌نوشت `Dockerfile` |

> با `git mv` انجام شد، پس تاریخچه حفظ شد. این در `git diff` به‌صورت D+A دیده می‌شود ولی **حذف نیست**.

---

## ۵. یکسان‌سازی کد تکراری

### مشکل: منطق پول در دو جا

| مرحله | اقدام | نتیجه |
|---|---|---|
| ۱ | هارنس ۱۰۹۱ موردی نوشتم و رفتار دو نسخه را مقایسه کردم | **یکسان بودند** — پس می‌توان قفل کرد |
| ۲ | ۹۱۱ بردار مرجع تولید شد (`shared/*.json`) | مرجع مشترک |
| ۳ | **هر دو طرف** همان بردارها را اجرا می‌کنند | اگر یکی منحرف شود، تست می‌شکند |
| ۴ | انحراف عمدی تزریق کردم | **تست شکست** ✅ — قفل واقعاً کار می‌کند |

**آنچه مهم است: کد قیمت‌گذاری دست نخورد.** کپی‌های موازی را ادغام **نکردم**،
چون رفتارشان یکسان بود و ادغام یعنی تغییر کد پول بدون نیاز. به‌جایش
«برابری» را قفل کردم — ارزان، بی‌ریسک، و در آینده جلوی انحراف را می‌گیرد.

### یکسان‌سازی‌های دیگر

| مورد | قبل | بعد |
|---|---|---|
| مسیر آپلود | `process.cwd()` در ۳ فایل تکرار شده بود | `getUploadRoot()` / `getUploadDir()` |
| lint | `lint` = `--fix` (مخرب) | `lint` فقط بررسی می‌کند، `lint:fix` جدا |
| resolver تست فرانت | صدور inline | `tests/register-resolver.mjs` |

---

## ۶. وابستگی‌ها

### حذف‌شده (۳) — همگی صفر import

| پکیج | تأیید |
|---|---|
| `uuid` | `grep -rn "from 'uuid'"` → ۰ |
| `cache-manager-redis-yet` | کدش کامنت شده بود (بلاک `CacheModule` در `app.module.ts`) |
| `@nestjs/mapped-types` | ۰ import |

**⚠️ باگ production که همین‌جا پیدا شد:** حذف از `package.json` **بدون بازسازی
lockfile** باعث می‌شد `pnpm install --frozen-lockfile` (که `dockerfile` اجرا
می‌کند) شکست بخورد. لاک‌فایل بازسازی و تأیید شد.

### اضافه‌شده (۰ پکیج جدید)

تنها فیلد `pnpm.onlyBuiltDependencies: [sharp, unrs-resolver]` به فرانت اضافه شد
(برای اینکه بیلدهای native در CI/biuld مجاز باشند).

---

## ۷. تغییرات کانفیگ

| فایل | تغییر | اثر |
|---|---|---|
| `back/package.json` | `lint` / `lint:fix` جدا شد | lint دیگر فایل را بازنویسی نمی‌کند |
| `front/package.json` | `test` اضافه شد (۵۴ تست خاموش احیا) | — |
| `back/.env.example` | **جدید** (۱۰۹ خط) | ۳۶ متغیر مستند شد؛ قبلاً **هیچ** الگویی نبود |
| `docker-compose.prod.yml` | loopback، healthcheck، log limit | بند ۹ |
| `back/Dockerfile` | بازنویسی با `ENV UPLOAD_DIR` | بند ۹ |

**هیچ متغیر محیطی حذف یا تغییرنام نداد. ۳۵ متغیر قبلی همه سر جایشان هستند.**

---

## ۸. تغییرات Build

| پروژه | دستور | نتیجه |
|---|---|---|
| back | `nest build` | ✅ exit 0 |
| back | `require("src/…")` در dist | ✅ **۰** (alias درست کامپایل شد) |
| front | `next build` | ✅ **۵۱ مسیر**، exit 0 |

**۵۱ مسیر قبل و بعد یکسان است** — هیچ صفحه‌ای اضافه/حذف نشد.

---

## ۹. تغییرات Deploy

### 🔴 دو باگ واقعی production

**باگ ۱ — نام فایل Docker**
```
back/dockerfile                 ← فایل واقعی
back/docker-compose.yml:25      → dockerfile: Dockerfile
```
روی Linux بیلد **شکست می‌خورد** (روی ویندوز/مک کار می‌کرد → دیده نشده بود).

**باگ ۲ — پورت‌های باز روی اینترنت**

| سرویس | قبل | بعد |
|---|---|---|
| MySQL | `3307:3306` (از اینترنت) | `127.0.0.1:3307:3306` |
| Redis | `6381:6379` (از اینترنت) | `127.0.0.1:6381:6379` |
| Backend | `3000:3000` | **بدون تغییر** |

**پورت هاست تغییر نکرد** → Nginx و هر کانفیگ بیرونی سالم می‌ماند.

### بهبودهای پایداری

| مورد | قبل | بعد |
|---|---|---|
| healthcheck | نداشت | `/api/health` |
| log | بی‌سقف (دیسک پر می‌شد) | `json-file: 20m × 5` |
| shutdown | SIGKILL روی restart | `enableShutdownHooks()` + Redis close |
| uploads | hard-code | `UPLOAD_DIR` (پیش‌فرض **دقیقاً** مثل قبل) |

`UPLOAD_DIR` در **دو حالت** با اجرای واقعی تست شد:
```
UPLOAD_DIR=/tmp/test-uploads → /tmp/test-uploads + /tmp/test-uploads/blog
unset                        → <cwd>/uploads   (رفتار قبلی)
```

---

## ۱۰. نتیجهٔ سه Audit

### (الف) ساختاری ✅

Tarjan SCC روی گراف import واقعی (۲۰۷ فایل، ۳۴۱ یال):

| | `main` | نهایی |
|---|---|---|
| چرخه | ۳ | ۳ |
| **چرخهٔ جدید** | — | **۰** ✅ |

سه چرخهٔ موجود **همه از قبل بودند** و هر سه رابطهٔ دوطرفهٔ استاندارد TypeORM
هستند (`club`، `locations`، `ticket`) که داخل decorator arrow-function
حل می‌شوند → بی‌خطر. **عمداً نشکستم** (شکستنشان یعنی `string` جادویی یا
`import type` که فقط چرخه را جابه‌جا می‌کند = پیچیدگی بی‌فایده).

### (ب) عملکردی ✅

**مقایسهٔ ماشینی سطح API** — همهٔ `@Get/@Post/…` از هر controller استخراج و با
`@Controller(prefix)` ترکیب شد:

```
main:   141 مسیر واقعی
نهایی:  141 مسیر واقعی + 2 health
diff →  IDENTICAL
```

> ⚠️ **یک لحظهٔ مهم:** diff اولیه نشان داد ۵ اندپوینت `/notification` **ناپدید** شده‌اند.
> بررسی کردم: آن‌ها **هرگز mount نشده بودند** — module هیچ `controllers` نداشت،
> service از هیچ‌جا import نمی‌شد، entity هرگز به `forFeature` نرسیده بود،
> و فرانت هیچ‌وقت صدایشان نمی‌زد. scaffold خام `nest g resource` بودند.
> **هیچ قابلیتی از دست نرفت — تأیید شد، نه فرض.**

### (ج) Production ⚠️ نیمه‌اجرا

| مورد | نتیجه |
|---|---|
| ۲ باگ واقعی | ✅ پیدا و رفع شد (بند ۹) |
| ۲ ریسک بحرانی | 🔴 مستند شد، **تغییر نکرد** (نیازمند تأیید) |
| `docker build` | ❌ **اجرا نشد** (Docker در محیط نیست) |
| Nginx / SSL / PM2 | ❌ **اجرا نشد** (در مخزن نیست) |

---

## ۱۱. تست‌هایی که واقعاً اجرا شدند

| # | دستور | نتیجه |
|---|---|---|
| ۱ | `back: tsc --noEmit` | ✅ **۰ خطا** |
| ۲ | `back: eslint "src/**/*.ts"` | ✅ **۰ خطا** |
| ۳ | `back: jest` | ✅ **۳۵۲ پاس، ۳ skip، ۳۵۵ کل** (۵۹ suite) |
| ۴ | `back: nest build` | ✅ exit 0 |
| ۵ | `back: grep require("src/ dist` | ✅ **۰** |
| ۶ | `front: tsc --noEmit` | ✅ **۰ خطا** |
| ۷ | `front: eslint .` | ✅ **۰ خطا** (۲۰ warning `<img>`) |
| ۸ | `front: node --test` | ✅ **۵۴ پاس، ۰ fail** |
| ۹ | `front: next build` | ✅ **۵۱ مسیر** |
| ۱۰ | چرخه‌یابی SCC | ✅ ۰ چرخهٔ جدید |
| ۱۱ | diff مسیرهای API | ✅ یکسان |
| ۱۲ | پوشش env | ✅ ۱ شکاف واقعی پیدا و رفع شد |
| ۱۳ | `UPLOAD_DIR` (دو حالت) | ✅ مطابق انتظار |
| ۱۴ | `python3 yaml.safe_load` روی compose | ✅ ساختار سالم |
| ۱۵ | بوت واقعی `node dist/src/main.js` | ⚠️ تا `TypeOrmModule initialized` رفت، بعد بدون MySQL متوقف شد |
| ۱۶ | فاز ۴ در کپی کامل (`/tmp/mono`) | ✅ اندازه‌گیری شد (بند ۱۲) |

---

## ۱۲. مسائل باقی‌مانده

### 🔴 ریسک بحرانی — تغییر نکرد، نیازمند تصمیم شما

**۱. DDL در زمان بوت → سایت بالا نمی‌آید**
`BarberService.onModuleInit` یک `ALTER TABLE` می‌زند و اگر ستون
`is_publicly_visible` ساخته نشود **rethrow می‌کند** → 502.
این رفتار **عمدی** است و تست قفلش کرده
(`barber-visibility-schema.spec.ts` → «fails startup with the original error»).
**تغییر نکرد.** راه‌حل: `sql/PRE-DEPLOY-CHECK.sql` قبل از هر deploy.

**۲. زنجیرهٔ `cwd` → `.env` → `synchronize`**
`ConfigModule.forRoot()` هیچ `envFilePath` ندارد؛ پیش‌فرض `@nestjs/config`:
```js
resolve(process.cwd(), '.env')     // config.module.js:76
```
اگر `cwd` پروسهٔ PM2 غلط باشد → `.env` **بی‌صدا** لود نمی‌شود → `NODE_ENV`
`undefined` می‌شود → `typeorm.config.ts:17` مقدار `synchronize` را **true**
می‌بیند → **خطر تغییر اسکیمای production**. مستند شد؛ کد تغییر نکرد.

### ❌ اجرا نشد — **به‌عنوان پاس ثبت نمی‌شود**

| مورد | دلیل | ریسک |
|---|---|---|
| `docker build` / `compose config` | Docker در محیط نیست | **بالا** |
| MySQL/Redis واقعی | دیتابیس در محیط نیست | متوسط |
| Nginx / SSL / PM2 / crontab | روی سرور است | متوسط |
| `front/tests/pwa/worker.test.mjs` | نیازمند سرور در حال اجرا | پایین |
| Playwright (۴ فایل) | نیازمند chromium | پایین |
| **فایل CI** | توکن مجوز `workflows` ندارد — **دوباره امتحان و تأیید شد** | پایین |

### ⚠️ تصمیم‌های آگاهانه

| مورد | تصمیم |
|---|---|
| Monorepo | ❌ **رد شد** — با آزمایش واقعی (جزئیات پایین) |
| ۳ چرخهٔ TypeORM | ✅ پذیرفته — بی‌خطرند |
| `process.cwd()` در `ConfigModule` | ⏸ منتظر تأیید (تغییر رفتار است) |
| `<img>` → `next/image` | ❌ انجام نشد — تغییر UI است، نه refactor |

### چرا monorepo رد شد (اندازه‌گیری، نه نظر)

روی یک کپی کامل (`/tmp/mono`) با workspace واقعی تست شد:

| بررسی | نتیجه |
|---|---|
| `pnpm install` | ✅ ۴۲ ثانیه |
| back `tsc` / `nest build` / jest | ✅ **۰ / ok / ۳۴۷** |
| front `tsc` / تست / eslint | ✅ **۰ / ۵۴ / ۰** |
| **`next build`** | ❌ **شکست** — Turbopack بیرون از root نمی‌رود |
| `node-linker=hoisted` | ❌ **رفع نکرد** (آزمایش و رد شد) |
| راه‌حل | `turbopack: { root: path.resolve(process.cwd(), '..') }` → ✅ ۵۱ مسیر |
| **بلاکر deploy** | `pnpm@8.15.4` در Dockerfile + لاک‌فایل v9 → `ERR_PNPM_LOCKFILE_BREAKING_CHANGE` |
| هزینهٔ پنهان | **۵۲ نسخهٔ وابستگی** عوض می‌شود (back ۲۳/۵۸، front ۲۹/۵۷) |

**نتیجه:** هدف واقعی (یکتایی منطق پول) قبلاً **بدون ریسک** محقق شده بود.
پس monorepo الان فقط ریسک اضافه می‌کند.

**ترتیب امن اگر روزی خواستید:** Docker/pnpm → pin `^` → workspace → `turbopack.root` → بازبینی `cwd`.

---

## ۱۳. اجرای محیط توسعه

```bash
# بک‌اند
cd back
cp .env.example .env          # مقادیر MySQL/Redis را پر کنید
pnpm install
pnpm start:dev                # → http://localhost:3000/api
                              # → Swagger فقط وقتی NODE_ENV != production

# فرانت (ترمینال دوم)
cd front
pnpm install
npm run dev                   # → http://localhost:3000

# تست‌ها
cd back  && pnpm test         # ۳۵۵ تست
cd front && npm test          # ۵۴ تست
```

**پیش‌نیاز:** MySQL (پورت پیش‌فرض `3306`) و Redis (`6379`).
بدون Redis سرویس بالا می‌آید ولی ۳ تست skip می‌شوند.

---

## ۱۴. اجرای Build و Production

```bash
# بک‌اند
cd back
pnpm install --frozen-lockfile
pnpm build                    # → dist/src/main.js
NODE_ENV=production node dist/src/main.js

# فرانت
cd front
pnpm install --frozen-lockfile
npm run build                 # → .next  (۵۱ مسیر)
NODE_ENV=production npm start
```

> **نکته:** `npm run build` فرانت شامل `inline-critical-css.mjs` هم هست.
> فقط `next build` را اجرا نکنید.

---

## ۱۵. Deploy روی سرور

**قبل از هر چیز:**

```bash
# ۱. بررسی اسکیما (فقط-خواندنی، امن روی production)
mysql -u root -p <db> < back/sql/PRE-DEPLOY-CHECK.sql
# هر ردیف MISSING → اول فایل sql/ مربوطه، بعد restart

# ۲. بکاپ تازه + تست ری‌استور
mysqldump --single-transaction --routines --triggers -u root -p <db> \
  > /var/backups/monshim-$(date +%F-%H%M).sql
mysql -u root -p -e "CREATE DATABASE monshim_restore_test"
mysql -u root -p monshim_restore_test < /var/backups/monshim-<file>.sql
mysql -u root -p -e "SELECT COUNT(*) FROM monshim_restore_test.booking"
mysql -u root -p -e "DROP DATABASE monshim_restore_test"

# ۳. تأیید cwd و NODE_ENV پروسهٔ PM2 (ریسک بند ۱۲-۲)
pm2 jlist | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    print(p['name'], '-> cwd =', p['pm2_env'].get('pm2_cwd'))
"
pm2 env 0 | grep NODE_ENV      # باید production باشد
```

**دیپلوی:**

```bash
cd <مسیر پروژه>
git fetch && git checkout <sha>
cd back  && pnpm install --frozen-lockfile && pnpm build && cd ..
cd front && pnpm install --frozen-lockfile && npm run build && cd ..
pm2 restart monshim-backend && pm2 restart monshim-frontend

# تأیید
curl -s localhost:3000/api/health/ready
curl -s https://<دامنه>/api/health
```

**Docker (روی سرور، چون در این محیط قابل تست نبود):**

```bash
cd back
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps        # باید healthy باشد
```

**Rollback:**
```bash
git checkout <sha قبلی>
cd back && pnpm install --frozen-lockfile && pnpm build
cd ../front && pnpm install --frozen-lockfile && npm run build
pm2 restart monshim-backend && pm2 restart monshim-frontend
```

> **محدودیت:** rollback کد، داده را برنمی‌گرداند. به همین دلیل قاعده:
> **هر تغییر اسکیما باید فقط افزودنی باشد** (`ADD COLUMN` با `DEFAULT`).
> راهنمای کامل: `back/docs/DEPLOY.md`

---

## جمع‌بندی صادقانه

**آمادهٔ merge است؟** برای کد **بله** — Audit (الف) و (ب) کامل و پاس.
**آمادهٔ release است؟** **نه.** Audit (ج) نیمه‌کاره است: `docker build`،
Nginx، SSL و PM2 اجرا **نشدند** و دو ریسک بحرانی آگاهانه تغییر **نکردند**.

طبق قاعدهٔ خودمان، تا این‌ها بسته نشوند **«release-ready» نمی‌گویم**.

### حداقل قبل از merge

۱. `back/sql/PRE-DEPLOY-CHECK.sql` روی production
۲. بکاپ تازه + تست ری‌استور
۳. `ls -l .env` در `cwd` واقعی PM2 + `pm2 env 0 | grep NODE_ENV`

### بعد از merge (سرور یا staging)

۴. `docker compose -f back/docker-compose.prod.yml build`
۵. `curl -s localhost:3000/api/health/ready`
۶. باز کردن یک `/uploads/...` **از طریق دامنه** (نه localhost)
