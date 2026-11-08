# Roadmap اجرایی مهاجرت معماری Monshim

**وضعیت:** پیش‌نویس برای تأیید — **هیچ تغییری اجرا نشده است**
**پیش‌نیاز مطالعه:** `01-ANALYSIS.md`

---

## قواعد حاکم بر همهٔ فازها

1. **هر فاز = یک commit قابل revert.** هیچ فاز هم‌زمان ساختار و منطق را عوض نمی‌کند.
2. **دروازهٔ سخت هر فاز:** `tsc --noEmit` (هر دو) + `pnpm test` (۳۲۵ تست) + `pnpm build` (هر دو) + `next lint` بدون خطای **جدید**.
3. **هیچ فازی لمس نمی‌کند:** `.env`، دیتابیس، Nginx، SSL، PM2/Docker running.
4. **فاز بعدی شروع نمی‌شود** تا دروازهٔ فاز قبل سبز نشود.
5. اگر تستی شکست خورد، **قبل از ادامه** علت رفع می‌شود.
6. تغییرات هر فاز در `docs/architecture/CHANGELOG.md` ثبت می‌شود.

**وضعیت پایهٔ اندازه‌گیری‌شده (Baseline):**

```
✅ nest build        → موفق
✅ pnpm test (back)  → 325 passed / 53 suites
✅ tsc --noEmit back → 1 خطا در spec (body-parsers.spec.ts:76)
✅ tsc --noEmit front→ بدون خطا
✅ next build        → موفق، ۴۴ مسیر
❌ eslint back       → ۲۳ خطا (اسکریپت --fix دارد ⚠️)
❌ eslint front      → ۱۹ خطا
```

> ⚠️ **هشدار عملیاتی:** `pnpm lint` در `back` گزینهٔ `--fix` دارد و **بدون تأیید، فایل‌ها را تغییر می‌دهد**. این خودش در فاز ۲ اصلاح می‌شود. تا آن زمان فقط `npx eslint <path>` بدون `--fix` استفاده می‌کنیم.

---

## فاز ۰ — تثبیت وضعیت پایه (Baseline Lock)

**هدف:** قبل از هر تغییر، یک نقطهٔ بازگشت مطمئن و اندازه‌گیری‌شده داشته باشیم.

| # | تسک | جزئیات |
|---|---|---|
| 0.1 | ثبت وضعیت Git | شاخهٔ `arena/bd03e7a3-monshim`، commit مرجع در CHANGELOG |
| 0.2 | ثبت Baseline سبز | اجرای هر ۶ دستور بالا و ثبت خروجی |
| 0.3 | بررسی `git status` | تأیید نبود تغییر ناخواسته (الان فقط `docs/` است) |
| 0.4 | Snapshot فایل‌های حساس | `sha256sum` از `.env*`, `docker-compose*.yml`, `next.config.ts`, `package.json`ها |

**خروجی:** `docs/architecture/CHANGELOG.md` با Baseline.
**ریسک:** هیچ (فقط خواندن).
**پذیرش:** Baseline ثبت شد و `git status` فقط `docs/` را نشان می‌دهد.

---

## فاز ۱ — پاک‌سازی کد مرده (بدون تغییر ساختار)

**هدف:** حذف کد و وابستگی مرده **قبل از** جابه‌جایی، تا مهاجرت روی حجم کمتری انجام شود و ریسک «چه چیزی استفاده می‌شود؟» صفر شود.

**دلیل ترتیب:** اگر اول ساختار را عوض کنیم، تشخیص کد مرده سخت‌تر می‌شود. حذف اول = مهاجرت ساده‌تر.

### ۱.۱ حذف کامپوننت‌های مرده (۱۹ فایل، تأیید دو مرحله‌ای شده)

| فایل | شواهد | اقدام |
|---|---|---|
| `components/admin/settings/financial-settings.tsx` | ۰ ارجاع | حذف |
| `components/dashboard/appointments/appointment-search.tsx` | ۰ | حذف |
| `components/dashboard/layout/floating-action-button.tsx` | ۰ | حذف |
| `components/dashboard/layout/mobile-header.tsx` | ۰ | حذف |
| `components/dashboard/layout/profile-edit-modal.tsx` | ۰ | حذف |
| `components/dashboard/sections/dashboard-header.tsx` | ۰ | حذف |
| `components/dashboard/sections/quick-action-section.tsx` | ۰ | حذف |
| `components/form/rhf-switch.tsx` | ۰ | حذف |
| `components/marketing/home/home-personas.tsx` | ۰ | حذف |
| `components/marketing/home/home-problems.tsx` | ۰ | حذف |
| `components/marketing/home/home-product.tsx` | ۰ | حذف |
| `components/pages/barber/shareModal.tsx` | ۰ | حذف |
| `components/pages/profile/settingMenu.tsx` | ۰ | حذف |
| `components/pages/profile/userCard.tsx` | ۰ | حذف |
| `components/shared/time-input.tsx` | ۰ | حذف |
| `components/ui/accordion.tsx` | ۰ (ui shadcn) | حذف |
| `components/ui/avatar.tsx` | ۰ | حذف |
| `components/ui/scroll-area.tsx` | ۰ | حذف |

> ⚠️ **۴ فایل از این فهرست را حذف نمی‌کنیم** چون با `next/dynamic` ارجاع دارند و اسکن ساده آن‌ها را نمی‌بیند:
> `blog-editor.tsx`، `marketing-mobile-menu.tsx`، `pwa-install-modal.tsx` — **زنده‌اند**.
> (این یک تلهٔ واقعی است که در تحلیل اولیه گرفته شد.)

### ۱.۲ حذف کد مردهٔ بک‌اند

| فایل | شواهد | اقدام |
|---|---|---|
| `src/auth/dto/reset-password.dto.ts` | ۰ ارجاع، اندپوینت وجود ندارد | حذف |
| `src/barber/dto/create-barber.dto.ts` | کلاس خالی، ۰ ارجاع | حذف |
| `src/settings/dto/create-setting.dto.ts` | کلاس خالی، ۰ ارجاع | حذف |
| `src/notification/notification.controller.ts` | در هیچ ماژولی ثبت نشده، اندپوینت غیرفعال | حذف |
| `src/notification/dto/*` | اگر فقط توسط همان controller مرده استفاده می‌شوند | حذف |

> 🔍 **قبل از حذف `notification.controller.ts` باید تأیید شود** که `/api/notification` در Production واقعاً ۴۰۴ می‌دهد (چون ثبت نشده). این یک بررسی امن قبل از حذف است.

### ۱.۳ حذف وابستگی‌های مرده

| پکیج | طرف | شواهد | اقدام |
|---|---|---|---|
| `uuid` | back | ۰ `from 'uuid'`؛ کد از `crypto.randomUUID` استفاده می‌کند | حذف |
| `cache-manager-redis-yet` | back | ۰ ارجاع | حذف |
| `@nestjs/mapped-types` | back | ۰ ارجاع | حذف |

> ❗️ **حذف نمی‌شود:** `@nestjs/cache-manager` و `cache-manager` — واقعاً در `locations.service.ts` استفاده می‌شوند.

### ۱.۴ حذف اندپوینت مردهٔ فرانت

| مورد | شواهد | اقدام |
|---|---|---|
| `endpoints.categories` (۲ کلید) در `services/api/endpoints.ts` | ۰ استفاده؛ بک‌اند `categories` ندارد | حذف |

**فایل‌های تحت تأثیر:** ۲۳ فایل حذف، ۳ فایل `package.json`/`endpoints.ts` ویرایش
**وابستگی:** فاز ۰
**ریسک:** پایین — هر فایل دو بار تأیید شده
**تست:** `tsc --noEmit` + `test` + `build` + `next build`
**پذیرش:**
- ✅ `next build` موفق و تعداد مسیرها **۴۴** (بدون تغییر)
- ✅ ۳۲۵ تست پاس
- ✅ صفر Import شکسته (tsc)
- ✅ حجم باندل کاهش یا ثابت (اندازه‌گیری با خروجی build)

---

## فاز ۲ — سبز کردن Quality Gate (پیش‌نیاز CI)

**هدف:** ESLint و `tsc` را از حالت قرمز خارج کنیم تا بتوانیم در فاز ۷ CI را با اعتبار فعال کنیم.

| # | تسک | جزئیات |
|---|---|---|
| 2.1 | جدا کردن `lint:fix` از `lint` | `back/package.json`: `"lint": "eslint ..."` (بدون `--fix`) + `"lint:fix": "... --fix"` |
| 2.2 | رفع ۲۳ خطای ESLint بک‌اند | `require-await` در `payment.service.ts:1293` و specها، `no-base-to-string:134`، unused imports در `notification.service.ts` |
| 2.3 | رفع ۱۹ خطای ESLint فرانت | عمدتاً `simple-import-sort` در `components/ui/*` |
| 2.4 | رفع خطای `tsc` در `body-parsers.spec.ts:76` | cast صحیح `INestApplication` |
| 2.5 | تصمیم دربارهٔ `components/ui/*` تولیدشده | یا `--fix` یک‌بار، یا افزودن به `ignores` |

> ⚠️ **۲.۲ و ۲.۳ نیاز به تأیید شما دارند** چون فایل‌های سورس را تغییر می‌دهند (هرچند فقط import-ordering و حذف import بی‌استفاده). من هیچ‌کدام را بدون اجازه اعمال نمی‌کنم.

**ریسک:** پایین — تغییرات مکانیکی، صفر تغییر رفتار
**پذیرش:** `eslint` هر دو پروژه **۰ خطا**؛ `tsc --noEmit` هر دو **۰ خطا**؛ ۳۲۵ تست پاس.

---

## فاز ۳ — استخراج `packages/contracts` (بدون monorepo)

**هدف:** **حذف دوگانگی منطق پول** — مهم‌ترین دستاورد فنی این پروژه.

**چرا این فاز قبل از monorepo است؟** چون می‌توانیم `contracts` را با یک **path alias موقت** در هر دو پروژه مصرف کنیم و رفتار را **قبل از** تغییر ساختار پوشه‌ها تأیید کنیم. اگر هم‌زمان با monorepo انجام شود و چیزی بشکند، نمی‌دانیم علتش کدام است.

### ۳.۱ محتوای منتقل‌شده

| از | به | یادداشت |
|---|---|---|
| `front/lib/order-pricing.ts` (بخش‌های مشترک) | `contracts/src/money/*` | فقط توابع **یکسان** |
| `back/src/payment/deposit-amount.ts` (بخش‌های مشترک) | `contracts/src/money/*` | منبع واحد |
| `front/lib/national-code.ts` + `back/src/common/utils/national-code.util.ts` | `contracts/src/persian/national-code.ts` | منطق یکسان است |
| `toEnglishDigits`/`toPersianDigits` (۳+۳ نسخه) | `contracts/src/persian/digits.ts` | یکی می‌شود |
| `ApiSingleResponse`/`ApiListResponse`/`PaginationMeta` | `contracts/src/api/response.ts` | **فقط type**، بدون تغییر شکل |

### ۳.۲ آنچه **منتقل نمی‌شود**

| مورد | دلیل |
|---|---|
| `extractBaseDepositToken` | ❗️ دو نسخه **رفتار متفاوت** دارند (backend یک `regex` اعتبارسنجی اضافه) — نیاز به تصمیم شما |
| `computeDepositAmounts` | فقط بک‌اند استفاده می‌کند |
| `formatCommissionLabel` | فقط فرانت (UI) |
| `resolveFlatRate` | فقط بک‌اند |
| `cn` / `ClassValue` | مخصوص UI فرانت |

### ۳.۳ روش امن انتقال (۴ گام کوچک)

```
3.a  ساخت contracts + انتقال توابع یکسان + کپی ۳۲۵ تست مرتبط
     → هیچ Importی هنوز عوض نشده. تست: contracts build + test
3.b  بک‌اند از contracts مصرف کند، فایل قدیمی re-export کند
     → تست: ۳۲۵ تست پاس + build
3.c  فرانت از contracts مصرف کند، فایل قدیمی re-export کند
     → تست: next build + تست‌های order-pricing
3.d  حذف re-exportها و فایل‌های دوگانه
     → تست: همه چیز سبز + grep تأیید صفر تعریف تکراری
```

**ریسک:** متوسط (منطق پول)
**تست ویژه:** مقایسهٔ خروجی. یک اسکریپت یک‌بارمصرف می‌نویسیم که N ورودی تصادفی به **نسخهٔ قدیم و جدید** بدهد و خروجی را مقایسه کند (property-based diff). این تنها راه اطمینان از «تغییر رفتار نکرده».
**پذیرش:**
- ✅ خروجی محاسبات برای ۱۰۰۰ ورودی تصادفی **بایت‌به‌بایت یکسان** با قبل
- ✅ ۳۲۵ تست + تست‌های منتقل‌شده پاس
- ✅ `grep` نشان دهد `computeProgressiveCommission` فقط **یک** تعریف دارد
- ✅ هیچ فایل بک‌اند/فرانت دیگر منطق قیمت‌گذاری محلی ندارد

---

## فاز ۴ — تبدیل به pnpm workspace (Monorepo)

**هدف:** یک لاک‌فایل، نصب واحد، کش مشترک، امکان استفاده از `contracts` به‌صورت پکیج واقعی.

| # | تسک | جزئیات |
|---|---|---|
| 4.1 | `back/` → `apps/api/`، `front/` → `apps/web/` | `git mv` (تاریخچه حفظ می‌شود) |
| 4.2 | ساخت `pnpm-workspace.yaml` | `apps/*`, `packages/*` |
| 4.3 | `package.json` ریشه با `workspaces` + اسکریپت‌ها | `dev`, `build`, `lint`, `typecheck`, `test` |
| 4.4 | یکسان‌سازی نسخهٔ pnpm | انتخاب **pnpm 9** (چون فرانت روی ۹ است و `node-linker` را کنترل می‌کنیم) |
| 4.5 | بازسازی لاک‌فایل واحد | حذف ۳ لاک‌فایل، `pnpm install` تازه |
| 4.6 | `.npmrc` با `node-linker=hoisted` | ❗️ **ضروری برای Nest** — `nest build` با symlinkهای pnpm مشکل دارد |
| 4.7 | `tsconfig.base.json` + ارجاع از هر اپ | `baseUrl` هر اپ حفظ می‌شود |
| 4.8 | انتقال `contracts` به `packages/contracts` با نام `@monshim/contracts` | — |
| 4.9 | `.gitignore` واحد | ادغام سه `.gitignore` |
| 4.10 | به‌روزرسانی `paths` در `apps/web/tsconfig.json` | `@/*` → `./src/*` **یا** حفظ ساختار فعلی |

**تصمیم مهم ۴.۱۰:** دو گزینه
- **الف) حفظ ساختار فعلی** (`apps/web/lib`, `apps/web/app` بدون `src/`) → **صفر تغییر import، صفر ریسک.** ✅ **توصیهٔ من**
- ب) انتقال به `src/` → ۳۰۰+ Import عوض می‌شود، **صفر بهبود رفتار**

**فایل‌های تحت تأثیر:** همهٔ مسیرها + ۳ `package.json` + `tsconfig`ها + `.gitignore`ها
**وابستگی:** فاز ۳ (contracts باید وجود داشته باشد)
**ریسک:** **بالا** — بزرگ‌ترین فاز ساختاری
**تست:**
- `pnpm install` از ریشه بدون خطا
- `pnpm --filter @monshim/api build` + `test`
- `pnpm --filter @monshim/web build`
- اجرای `node apps/api/dist/src/main.js` (تأیید `require`های نسبی)
- `grep -rn 'require("src/' apps/api/dist` → **۰**
**پذیرش:**
- ✅ یک لاک‌فایل، صفر خطای نصب
- ✅ ۳۲۵ تست پاس
- ✅ هر دو Build موفق، ۴۴ مسیر فرانت
- ✅ `tsc --noEmit` صفر خطا
- ✅ پورت‌ها/`.env`/`uploads` **دست‌نخورده**
- ✅ فرآیند dev محلی کار می‌کند

> 🔍 **نکتهٔ حیاتی:** `.env` فایل‌ها **جابه‌جا یا بازتولید نمی‌شوند**. برای بک‌اند، `ConfigModule` مسیر `apps/api/.env` را صریح می‌گیرد. برای فرانت، `.env.local` در `apps/web`. این باید در تسک ۴.۱ به‌صورت دستی تأیید شود.

---

## فاز ۵ — استانداردسازی بک‌اند (الگوهای Ravand که ارزش دارند)

**هدف:** افزودن زیرساخت مفقود، **بدون** تغییر هیچ اندپوینت موجود.

| # | تسک | جزئیات | ریسک |
|---|---|---|---|
| 5.1 | `config/env.ts` با اعتبارسنجی | Joi/Zod برای متغیرهای **حیاتی**: `NODE_ENV`, `PORT`, `DATABASE_*`, `REDIS_*`, `JWT_*`. **fail-fast در Production**. متغیرهای اختیاری مقدار پیش‌فرض فعلی را حفظ می‌کنند | پایین |
| 5.2 | `common/bootstrap/setup-app.ts` | استخراج منطق `main.ts` (CORS، pipe، filter، interceptor، body parser) به یک تابع تست‌پذیر | پایین |
| 5.3 | `enableShutdownHooks()` | افزودن + `OnModuleDestroy` برای `RedisService` (`client.quit()`) | پایین، **فایدهٔ بالا** |
| 5.4 | `HealthModule` | `GET /api/health` (زنده) + `GET /api/health/ready` (`SELECT 1` + `PING` با timeout ۱ ثانیه) | پایین |
| 5.5 | `requestIdMiddleware` | هدر `X-Request-Id` + قرار دادن در `req` + افزودن به پاسخ Sentry | پایین |
| 5.6 | `LoggingInterceptor` | متد/مسیر/status/زمان + requestId؛ با `LOG_HTTP=false` خاموش‌شدنی | پایین |
| 5.7 | یکسان‌سازی `SmsIrService` | الان در **۲ ماژول** به‌صورت جدا provide می‌شود → یک `SharedModule` یا `@Global` | پایین |

**آنچه در این فاز انجام نمی‌شود (عمداً):**
- ❌ تغییر `ResponseInterceptor` — ۱۴۷ نقطه در فرانت به آن وابسته
- ❌ افزودن `AppException`/`ErrorCode`
- ❌ `/api/v1` — رد شد (تحلیل در `01-ANALYSIS.md` بخش ۳.۱ ردیف ۱۸)
- ❌ `BaseEntity`، `timezone:'Z'`، soft-delete

**پذیرش:** ۳۲۵ تست پاس + `curl /api/health` → 200 + `curl /api/health/ready` → 200 با `db:ok,redis:ok` + **همهٔ اندپوینت‌های موجود بدون تغییر پاسخ**

---

## فاز ۶ — Migrations (⚠️ **جدا، اختیاری، نیازمند تأیید صریح + بکاپ**)

**هدف:** حذف وابستگی به SQL دستی و ایجاد `down()` برای rollback.

> 🛑 **این فاز فقط با تأیید صریح و در پنجرهٔ نگهداری و پس از `mysqldump` + تست restore اجرا می‌شود.**
> **در صورت تأیید نکردن، فازهای ۱–۵ و ۷–۹ بدون هیچ مشکلی کامل می‌شوند.**

| # | تسک | جزئیات |
|---|---|---|
| 6.0 | **بکاپ + تست restore** | `mysqldump` کامل + restore روی دیتابیس `monshim_restore_test` |
| 6.1 | `database/data-source.ts` + `typeorm-options.ts` | منبع واحد entity/migration؛ `synchronize` **دست نمی‌خورد** |
| 6.2 | بررسی `synchronize` | ✅ `back/src/common/config/typeorm.config.ts` روی `db:up` **فقط خواندن** |
| 6.3 | تولید baseline migration | `migration:generate` → **اجرا نمی‌شود**، فقط بازبینی می‌شود |
| 6.4 | بازنویسی idempotent | `up()` = «اگر نبود بساز»؛ `down()` = `throw` برای تغییرات داده‌محور |
| 6.5 | Baseline کردن جدول `typeorm_migrations` | INSERT دستی تا TypeORM فکر کند اجرا شده |
| 6.6 | تست در **staging** | روی کپی Production، `migration:run` و `migration:revert` |
| 6.7 | مستندسازی | `docs/architecture/MIGRATIONS.md` |

**ریسک:** 🔴 **فاجعه اگر بی‌احتیاط** — به همین دلیل آخرین فاز داده‌ای است.
**پذیرش:** migration در staging دوبار اجرا می‌شود (idempotent)، `revert` کار می‌کند، داده دست‌نخورده، Production **دست‌نخورده**.

---

## فاز ۷ — CI/CD و Quality Gate

**هدف:** جلوگیری از انتشار نسخهٔ معیوب.

| # | تسک | جزئیات |
|---|---|---|
| 7.1 | `.github/workflows/ci.yml` | `pnpm install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` |
| 7.2 | `.env.example` کامل | همهٔ متغیرها با توضیح (بر پایهٔ `back/ENVIRONMENT.md`) |
| 7.3 | اسکریپت `check` | `pnpm check` = typecheck + lint + test + build |
| 7.4 | (اختیاری) Husky + lint-staged | pre-commit: lint+format روی فایل‌های تغییر‌یافته |

**وابستگی:** فاز ۲ (ESLint سبز) و فاز ۴ (workspace)
**پذیرش:** CI روی یک PR تستی سبز می‌شود؛ **Build با خطای عمدی شکست می‌خورد** (تست خودِ Gate).

---

## فاز ۸ — Docker و Deploy (⚠️ **اختیاری، جدا از Refactoring**)

**هدف:** اصلاح مشکلات زیرساختی شناسایی‌شده.

| # | تسک | جزئیات | تأیید لازم |
|---|---|---|---|
| 8.1 | `back/dockerfile` → `Dockerfile` | رفع باگ حروف کوچک | ✅ |
| 8.2 | انتقال Docker به `infra/` | ساختار Ravand | ✅ |
| 8.3 | Dockerfile با `pnpm deploy --prod` | کاهش حجم | ✅ |
| 8.4 | bind پورت‌ها به `127.0.0.1` | MySQL/Redis امن | ✅ |
| 8.5 | `healthcheck` روی `/api/health` | readiness | ✅ |
| 8.6 | `logging: max-size` | جلوگیری از پر شدن دیسک | ✅ |
| 8.7 | `UPLOAD_DIR` مطلق | جلوگیری از گم‌شدن تصاویر | ✅ |

> 🛑 **هیچ‌کدام از این‌ها بدون تأیید اجرا نمی‌شود.** این فاز به‌تنهایی می‌تواند انجام **یا** کاملاً حذف شود.

**پذیرش:** `docker compose config` معتبر؛ Build موفق؛ `curl /api/health` از داخل شبکه؛ **پورت‌های عمومی بدون تغییر**.

---

## فاز ۹ — سه دورهٔ Audit

### دورهٔ ۱ — Structural & Code Audit

| بررسی | روش |
|---|---|
| ساختار پوشه‌ها | مقایسه با `01-ANALYSIS.md` بخش ۷ |
| Import و Path Alias | `tsc --noEmit` + `grep` برای مسیرهای شکسته |
| Circular Dependencies | اسکریپت تحلیل گراف (همان که در تحلیل استفاده شد) |
| فایل تکراری/بی‌استفاده | اسکن دو مرحله‌ای (import + dynamic) |
| کد تکراری | `grep` برای `۰۱۲۳۴۵۶۷۸۹`، `computeProgressiveCommission`، `toEnglishDigits` |
| Shared Packages | تأیید صفر وابستگی Nest/Next در `contracts` |
| Separation of Concerns | بازبینی: آیا `contracts` به `process.env` دست می‌زند؟ |
| TypeScript / ESLint | ۰ خطا هر دو |

**خروجی:** فهرست مشکلات ساختاری باقی‌مانده.

### دورهٔ ۲ — Functional & Integration Audit

| بررسی | روش | وضعیت واقعی |
|---|---|---|
| Unit tests | `pnpm test` | ۳۲۵ تست |
| Frontend session tests | `pnpm test:session` | ⚠️ نیاز به تأیید اجرا |
| Integration/E2E | `test:session:e2e` (Playwright) | ⚠️ نیاز به نصب chromium — ممکن است در sandbox ممکن نباشد |
| API Endpoints | مقایسهٔ مسیرها قبل/بعد (diff دو `grep @Controller` + `@Get/@Post`) | ✅ قابل انجام |
| Auth/Authorization | تست‌های موجود + بررسی دستی guardها | ✅ |
| Booking/Payment/Wallet | تست‌های موجود (۳۲۵ تست شامل این‌هاست) | ✅ |
| DB / Redis | ⚠️ نیازمند سرویس واقعی | ⚠️ اگر Docker نبود، **صریحاً گزارش می‌شود** |
| Front↔Back | Build + اعلام صادقانهٔ محدودیت | ⚠️ |

> **تعهد:** هر تستی که واقعاً اجرا نشود، در گزارش «اجرا نشد» ثبت می‌شود — نه «موفق».

### دورهٔ ۳ — Production & Deployment Audit

| بررسی | روش | محدودیت |
|---|---|---|
| Production Build | `pnpm build` هر دو | ✅ |
| Production Start | اجرای `node apps/api/dist/src/main.js` + `next start` | ✅ بدون DB/Redis → خطای اتصال انتظار می‌رود |
| Docker Build | `docker compose config` | ⚠️ Docker در sandbox نیست → **گزارش می‌شود** |
| Health Check | `curl` روی `/api/health` | ✅ |
| Nginx / Reverse Proxy | ❌ فایل در مخزن نیست | **گزارش به‌عنوان «بررسی‌نشده»** |
| Env vars | بررسی `env.ts` + `.env.example` | ✅ |
| Upload dir | بررسی مسیر و bind mount | ✅ |
| Persistence | بررسی volume در compose | ✅ |
| Restart سرویس‌ها | ⚠️ نیازمند سرور | **گزارش** |
| RAM/CPU | اندازه‌گیری Build | نسبی |
| Rollback | تست `git revert` یک فاز | ✅ |

**پذیرش نهایی:** هر سه دوره انجام و **محدودیت‌ها صریح ثبت** شده باشد.

---

## ترتیب و وابستگی فازها

```
فاز ۰ (Baseline)
   ↓
فاز ۱ (کد مرده) ────────────┐
   ↓                        │
فاز ۲ (Quality Gate)        │
   ↓                        │
فاز ۳ (contracts)           │ ← مهم‌ترین دستاورد فنی
   ↓                        │
فاز ۴ (monorepo)  ←─────────┘ بزرگ‌ترین ریسک ساختاری
   ↓
فاز ۵ (استانداردسازی بک‌اند)
   ↓
فاز ۶ (Migrations) ⚠️ اختیاری + تأیید جدا
   ↓
فاز ۷ (CI)
   ↓
فاز ۸ (Docker) ⚠️ اختیاری + تأیید جدا
   ↓
فاز ۹ (سه Audit)
```

**فازهای ۱–۵ و ۷ «هستهٔ» پروژه‌اند.** فازهای ۶ و ۸ اختیاری و از هم جدا هستند.

---

## تخمین حجم کار

| فاز | فایل‌های تغییر‌یافته | پیچیدگی | ریسک |
|---|---|---|---|
| ۰ | ۱ (سند) | خیلی کم | هیچ |
| ۱ | ~۲۶ | کم | کم |
| ۲ | ~۲۵ | کم | کم |
| ۳ | ~۱۲ | **متوسط-بالا** | متوسط |
| ۴ | ~همه (مسیر) | **بالا** | **بالا** |
| ۵ | ~۱۰ | متوسط | کم |
| ۶ | ~۵ + دیتابیس | **بالا** | **فاجعه‌بار اگر بی‌احتیاط** |
| ۷ | ~۴ | کم | کم |
| ۸ | ~۸ | متوسط | متوسط |
| ۹ | ۳ سند | کم | هیچ |

---

## نکات مهمی که قبل از تأیید باید بدانید

### ۱. آیا این پروژه واقعاً ارزش انجام دادن دارد؟
**بله، اما نه به قیمت همه چیز.** تنها **دو** سود واقعی و قابل اثبات:
- **حذف دوگانگی ۲۴۶ خط منطق پول** (فاز ۳) — ریسک مالی واقعی
- **یک لاک‌فایل و نصب بازتولیدپذیر** (فاز ۴) — پایداری Deploy

بقیهٔ فازها **الگوهای خوب Ravand** هستند که Monshim ندارد (health، env validation، shutdown hooks، CI). این‌ها ارزش دارند.

### ۲. آنچه به‌نظر «بازسازی معماری» است اما ارزشش کم است
انتقال `components/pages/*` به `src/features/*` — **۲۱۲ فایل، ۳۰۰+ Import، صفر تغییر رفتار.** من پیشنهاد **نمی‌کنم**. ساختار فعلی Monshim (`components/` + `services/features/`) قابل دفاع است.

### ۳. ریسک شمارهٔ یک این پروژه
**فاز ۴ (جابه‌جایی پوشه‌ها).** اگر چیزی بشکند، هیچ‌کدام از سودهای دیگر به دست نمی‌آید. به همین دلیل آن را بعد از فاز ۳ گذاشتم و با دروازهٔ‌های سخت احاطه کردم.

### ۴. پیشنهاد کاهش ریسک: «مسیر حداقلی»
اگر بخواهید کمترین ریسک با بیشترین سود، **محدودهٔ زیر** کافی است:

```
فاز ۰ → ۱ → ۲ → ۳ → ۵ → ۷ → ۹
(بدون monorepo، بدون Migrations، بدون Docker)
```

این یعنی: کد مرده حذف، ESLint سبز، **منطق پول یکتا**، health و env validation، CI فعال، و سه Audit. **بدون لمس ساختار پوشه‌ها** → نزدیک به صفر ریسک برای Production.

سپس اگر راضی بودید، فاز ۴ و ۶ و ۸ به‌صورت جداگانه.

---

## سؤالاتی که برای شروع لازم دارم

1. **کدام محدوده؟** کامل (۰–۹) یا مسیر حداقلی (بدون monorepo)؟
2. **دربارهٔ `extractBaseDepositToken`:** کدام رفتار درست است — نسخهٔ سخت‌گیرانه‌تر بک‌اند (با regex) یا نسخهٔ فرانت؟ (یا هر دو یکی در `contracts`)
3. **فاز ۲ (ESLint):** اجازه می‌دهید فایل‌های سورس برای اصلاح import-ordering تغییر کنند؟
4. **فاز ۶ (Migrations):** الان انجام شود یا بعد از تثبیت بقیه؟
5. **فاز ۸ (Docker):** آیا فرانت روی PM2 اجرا می‌شود یا Docker؟ (این روی پیشنهاد فاز ۸ مؤثر است)
6. **`node-linker=hoisted`:** اگر `nest build` با pnpm workspace مشکل داشت، اجازهٔ افزودن `.npmrc` را دارم؟

---

## وضعیت فعلی مخزن

```
$ git status --porcelain
?? docs/audit/          ← گزارش ممیزی قبلی (تأیید‌شده توسط شما)
?? docs/architecture/   ← همین دو سند
```

**هیچ فایل کدی تغییر نکرده است.** منتظر تأیید شما برای شروع فاز ۰.
