# تحلیل معماری Monshim و Ravand + طراحی مقصد

**تاریخ:** ۲۰۲۶-۱۱-۰۸
**نقش:** Senior Software Architect / Full-Stack / DevOps
**وضعیت:** گزارش تحلیل و برنامه — **هیچ تغییری اجرا نشده است**

> این سند مرحلهٔ ۱ و ۲ درخواست شماست: شناخت دو پروژه، مقایسه، و طراحی معماری مقصد.
> سند دوم (`REFACTOR-PLAN.md`) شامل Roadmap فازبندی‌شده است.
> **تا تأیید شما هیچ فایلی از Monshim تغییر نمی‌کند.**

---

## ۰. خلاصهٔ اجرایی — چیزی که باید قبل از هر چیز بدانید

من هر دو پروژه را کامل خواندم و روی Monshim بررسی‌های واقعی اجرا کردم (Build، تست، تحلیل وابستگی، اسکن Circular Dependency، اسکن کد مرده).

**نتیجهٔ کلیدی که برنامه را تغییر می‌دهد:**

**Ravand یک «قالب پایه» (starter template) است، نه یک سیستم Production با قدمت.** شواهد قطعی:

| واقعیت | Ravand | Monshim |
|---|---|---|
| تعداد تست | **۰ فایل تست** (تأیید شد) | **۳۲۵ تست پاس در ۵۳ سوئیت** |
| احراز هویت | **هیچ** (`grep AuthGuard/JwtService/@Public` → خالی) | JWT کامل + revocation در Redis + RolesGuard |
| ماژول‌های دامنه | ۱۳ ماژول CRUD نمونه | ۲۰ ماژول با منطق تجاری پیچیده (رزرو، پرداخت، کیف پول، اشتراک) |
| مهاجرت دیتابیس | ✅ TypeORM Migrations + `up/down` | ❌ ۹ فایل SQL دستی، بدون rollback |
| تاریخ‌ها | `timezone: 'Z'` (UTC) | ذخیره/خواندن بر پایهٔ ساعت تهران |
| اندازهٔ بزرگ‌ترین service | ~۱۵۰ خط | `payment.service.ts` = ۲۳۰۱ خط |
| صفحه‌های فرانت | ~۳۵ مسیر CRUD | ۴۴ صفحه با ۵ گروه layout و Session Hydration |

**پس:** کپی کردن مستقیم الگوی Ravand روی Monshim **فاجعه‌بار** است. بخش عمدهٔ Ravand (auth، تست، دامنه، حتی شبکهٔ تاریخ) یا وجود ندارد یا از Monshim عقب‌تر است.

**آنچه واقعاً ارزش برداشتن دارد** (و در برنامه فقط همین‌ها آمده):

1. **Monorepo با pnpm workspace + Turborepo** — تنها تغییری که واقعاً ساختاری است
2. **پکیج `contracts` مشترک** — که در Monshim **نیاز فوری** دارد، چون ۲۴۶ خط محاسبهٔ پول **دو بار** نوشته شده (اثبات پایین‌تر)
3. **کانفیگ مشترک tsconfig / eslint-plugins**
4. **`DataSource` واحد + Migrations با `down()`** — که مشکل P0 ممیزی قبلی را حل می‌کند
5. **`HealthModule`** — که Monshim ندارد
6. **الگوی `config/env.ts` با اعتبارسنجی** — که Monshim فاقد آن است
7. **`requestId` + Logging interceptor** — برای ردیابی خطا

**آنچه صریحاً برداشته نمی‌شود** (با دلیل در بخش ۳): `ResponseInterceptor` جدید، `AppException`/ErrorCode، API Versioning، `BaseEntity` با UUID اجباری، `useSecurityHeaders`، و **کل ساختار `src/features` فرانت Ravand**.

**نکتهٔ بحرانی که باید بدانید:** انتقال به monorepo **رفتار Monshim را تغییر نمی‌دهد** — چون به `Response` و `API` دست نمی‌زنیم. اما **پورت‌ها و مسیرهای Deploy را تحت تأثیر قرار می‌دهد** و این باید با هماهنگی سرور انجام شود (بخش ۴).

---

## ۱. ساختار فعلی Monshim (واقعیت اندازه‌گیری‌شده)

### ۱.۱ ساختار سطح بالا

```
monshim/                        ← هیچ workspace نیست
├── package.json                ← فقط concurrently + prettier (بدون workspaces)
├── pnpm-lock.yaml              ← 🐞 ۷KB، فقط ۲ وابستگی ریشه — در عمل بی‌استفاده
├── back/                       ← پروژهٔ مستقل، lockfile v6، pnpm 8.15.4
│   ├── src/                    ← ۲۶۵ فایل TS، ۲۰ ماژول
│   ├── sql/                    ← ۹ فایل SQL دستی (بدون migration)
│   ├── seed.ts                 ← اسکریپت مستقل با DataSource جداگانه
│   ├── dockerfile              ← ⚠️ حروف کوچک (compose به «Dockerfile» اشاره می‌کند)
│   └── docker-compose{,.dev,.prod}.yml
└── front/                      ← پروژهٔ مستقل، lockfile v9، pnpm 9
    ├── app/                    ← ۴۴ صفحه، ۵ route group
    ├── components/             ← ۲۱۲ فایل در ۱۳ پوشه
    ├── lib/                    ← ۳۸ فایل
    ├── services/               ← ۶۲ فایل (api/ + features/)
    └── package.json            ← بدون workspace
```

### ۱.۲ آمار واقعی (اجرا شد)

| سنجه | مقدار |
|---|---|
| فایل‌های TS بک‌اند | ۲۶۵ (از این تعداد ۵۴ spec) |
| تست بک‌اند | **۳۲۵ پاس / ۵۳ سوئیت** ✅ |
| فایل‌های TS/TSX فرانت | ۳۶۹ (بدون node_modules) |
| وابستگی‌های فرانت | ۴۶ dependency + ۱۱ dev |
| وابستگی‌های بک‌اند | ۳۳ dependency + ۲۸ dev |
| خطوط بزرگ‌ترین service | `payment.service.ts` ۲۳۰۱ / `booking.service.ts` ۲۲۰۷ / `barber.service.ts` ۱۹۳۷ |
| Importهای `src/...` در بک‌اند | **۴۶۵** (baseUrl-based، نه path alias) |
| Circular Dependency (بک‌اند) | **۹ حلقه** — همه بین entityها |
| Circular Dependency (فرانت) | **۱** (self-referential در `lib/utils.ts`) |

### ۱.۳ مشکلات ساختاری شناسایی‌شده (با شواهد)

| # | مشکل | شواهد دقیق | تأثیر |
|---|---|---|---|
| M1 | **سه لاک‌فایل ناهمگون** | `pnpm-lock.yaml` ریشه (v9، ۲ ورودی) + `back/` (v6، pnpm 8) + `front/` (v9، pnpm 9) | نصب غیرقابل بازتولید؛ `pnpm install` در ریشه چیزی نصب نمی‌کند |
| M2 | **بدون workspace** | `package.json` ریشه `workspaces` ندارد | هیچ کد مشترکی ممکن نیست؛ کش Build مشترک نیست |
| M3 | **۲۴۶ خط منطق پول دوبار نوشته شده** | `front/lib/order-pricing.ts` (۳۳۱ خط) ↔ `back/src/payment/deposit-amount.ts` (۴۱۳ خط). `computeServicePricing` **بایت‌به‌بایت یکسان**؛ `normalizeCommissionTiers` ۳۷ خط اختلاف؛ `extractBaseDepositToken` نسخهٔ backend یک اعتبارسنجی بیشتر دارد | **ریسک مالی مستقیم**: تغییر فرمول در یک طرف، صورت‌حساب مشتری و مبلغ درگاه را ناهماهنگ می‌کند |
| M4 | **۳ پیاده‌سازی `toEnglishDigits` و ۳ پیاده‌سازی `toPersianDigits`** | `lib/digits.ts`٬ `lib/national-code.ts:26`٬ `lib/phone.ts:6` — و `lib/utils.ts:33`، `lib/national-code.ts:33`، `components/pages/explore/explore-client.tsx:61` | نگهداری سه‌گانه؛ باگ ارقام فارسی در یک مسیر و نه مسیر دیگر |
| M5 | **۲ تابع هم‌کار برای URL تصویر** | `lib/utils.ts:getFullImageUrl` (۱۷ استفاده) و `lib/images.ts:publicImageUrl` (۲۸ استفاده) — منطق base URL تقریباً یکسان | ناسازگاری مسیر تصویر بین بخش‌ها |
| M6 | **Entityها Circular هستند** | ۹ حلقه: `user ↔ barber ↔ booking`، `province ↔ city`، `ticket ↔ ticket-message` | رایج در TypeORM و **کشنده نیست**، اما مانع جداسازی ماژول و تحلیل درخت است |
| M7 | **همهٔ ۴۶۵ Import با `src/...` مطلق** | `tsconfig.json` فقط `baseUrl: "./"` دارد | **مهاجرت به monorepo این را می‌شکند** (بخش ۴.۲) |
| M8 | **`uuid` نصب است ولی ۰ بار import می‌شود** | `grep "from 'uuid'"` → ۰؛ کد از `crypto.randomUUID` استفاده می‌کند | وابستگی مرده |
| M9 | **`cache-manager-redis-yet` و `@nestjs/mapped-types` بدون استفاده** | ۰ ارجاع در `src/` | وابستگی مرده |
| M10 | **کامپوننت‌های مرده** | ۱۹ فایل بدون هیچ ارجاع (تأیید دو مرحله‌ای) | حجم باندل و سردرگمی |
| M11 | **اندپوینت مرده در `endpoints.ts`** | `endpoints.categories` (۲ کلید) — بک‌اند هیچ `categories` ندارد، ۰ استفاده در فرانت | کد مرده |
| M12 | **`ResetPasswordDto` و `CreateBarberDto` و `CreateSettingDto` مرده‌اند** | هیچ ارجاعی؛ `CreateBarberDto` و `CreateSettingDto` کلاس خالی‌اند | کد مرده |
| M13 | **`NotificationController` وجود دارد ولی در هیچ ماژولی ثبت نشده** | `notification.module.ts` آن را در `controllers` ندارد | کد مرده (و اگر ثبت شود، بدون گارد است — ریسک امنیتی بالقوه) |

### ۱.۴ نقاط قوت Monshim که باید حفظ شوند

- ✅ ۳۲۵ تست واحد واقعی (Ravand صفر دارد)
- ✅ سیستم احراز هویت کامل: JWT + `sid` + revocation در Redis + `RolesGuard` + بررسی `isActive`
- ✅ منطق نشست فرانت بسیار بالغ (`session-refresh`، `session-coordination`)
- ✅ `ValidationPipe` سراسری با `whitelist` + `forbidNonWhitelisted`
- ✅ `AllExceptionsFilter` که خطای MySQL/Multer را به 4xx/503 معنادار تبدیل می‌کند
- ✅ Idempotency پرداخت (`settleVerifiedPayment`) و رزرو اتمیک (pessimistic lock)
- ✅ `schema-guard` و `PublicPageSchemaService` (idempotent)
- ✅ `ThrottleTracker` آگاه از کاربر (نه IP مشترک پروکسی)
- ✅ `Sentry` در هر سه لایه

> **اصل حاکم بر برنامه:** Monshim در لایهٔ دامنه **بهتر از** Ravand است. ما فقط **پوسته** را از Ravand می‌گیریم، نه محتوا را.

---

## ۲. ساختار Ravand (الگوی مرجع)

### ۲.۱ Monorepo

```
ravand/
├── package.json           ← workspaces: ["apps/*","packages/*"] + اسکریپت‌های ارکستریشن
├── pnpm-workspace.yaml    ← packages: apps/*, packages/*
├── turbo.json             ← گراف build/dependsOn
├── .husky/                ← pre-commit
├── lint-staged.config.mjs
├── .editorconfig
├── .env.example           ← یک env برای کل monorepo
├── apps/
│   ├── api/               ← NestJS
│   └── web/               ← Next.js App Router
├── packages/
│   ├── contracts/         ← ⭐ تایپ/کد خطا/envelope مشترک
│   ├── eslint-config/
│   └── tsconfig/
├── infra/
│   ├── docker-compose.yml
│   └── docker/{api,web}/Dockerfile
├── scripts/clean.mjs
└── docs/ROADMAP.md
```

### ۲.۲ الگوی ماژول بک‌اند

```
apps/api/src/
├── main.ts                ← bootstrap + loadEnv + process.exit(1) روی خطا
├── app.module.ts
├── config/
│   ├── env.ts             ← ⭐ Joi schema، تنها منبع حقیقت، fail-fast
│   └── log-levels.ts
├── common/
│   ├── bootstrap/setup-app.ts   ← ⭐ یک تابع برای main و تست
│   ├── database/{base.entity,paginate}.ts
│   ├── exceptions/app.exception.ts
│   ├── filters/http-exception.filter.ts
│   ├── interceptors/{logging,response}.interceptor.ts
│   ├── middleware/request-id.middleware.ts
│   ├── messages/messages.ts
│   └── validation/validation-error.ts
├── database/
│   ├── data-source.ts     ← برای CLI
│   ├── typeorm-options.ts ← ⭐ منبع واحد entity/migration glob
│   ├── migrations/        ← ⭐ با up/down
│   └── seeds/
├── health/health.controller.ts   ← ⭐ فقط DB ping + 503
└── modules/<domain>/       ← dto/, entities/, controller, service, module
```

**الگوی ماژول (یک ساختار یکسان برای همه):**
```
modules/tasks/
├── dto/{create,update,task-response}.dto.ts
├── entities/task.entity.ts
├── tasks.controller.ts
├── tasks.service.ts
└── tasks.module.ts
```

### ۲.۳ الگوی فرانت Ravand

```
apps/web/src/
├── app/                   ← App Router + error.tsx / loading.tsx / not-found.tsx
├── components/{ui,layout,common}
├── features/<domain>/{api,hooks,components,types,store}
├── hooks/
└── lib/{api,format,jalali,utils}.ts
```

### ۲.۴ قرارداد API در Ravand

```jsonc
// موفق
{ "success": true, "data": {...}, "message": "…", "meta": { "page":1, "limit":20, "total":42, "totalPages":3, "hasNextPage":true, "hasPreviousPage":false } }
// خطا
{ "success": false, "error": { "code":"VALIDATION_ERROR", "message":"…", "statusCode":400, "details":[{"field":"email","messages":["…"]}] }, "requestId":"…", "timestamp":"…", "path":"…" }
```

### ۲.۵ زیرساخت Ravand

- `infra/docker-compose.yml` — MySQL 8.4 با `--default-time-zone=+00:00`، پروفایل `full` برای api/web، healthcheck روی `/api/v1/health`
- `infra/docker/api/Dockerfile` — multi-stage + **`pnpm deploy --prod`** (۱۳۰MB به‌جای ۷۴۵MB)
- `infra/docker/web/Dockerfile` — **`output: 'standalone'`** + `node apps/web/server.js`
- `turbo.json` — گراف وابستگی Build با کش

---

## ۳. تفاوت‌های معماری و تصمیم‌های «گرفتن / نگرفتن»

### ۳.۱ جدول تصمیم (قلب این سند)

| # | الگوی Ravand | تصمیم | دلیل و شواهد |
|---|---|---|---|
| 1 | pnpm workspace + Turborepo | ✅ **می‌گیریم** | Monshim سه لاک‌فایل ناهمگون دارد (M1) و بدون workspace است (M2). تنها راه تمیز برای `contracts` مشترک |
| 2 | `packages/contracts` | ✅ **می‌گیریم — با محتوای Monshim** | ۲۴۶ خط منطق پول دوبار نوشته شده (M3). این مهم‌ترین انگیزهٔ فنی کل مهاجرت است |
| 3 | `packages/tsconfig` (base.json) | ✅ **می‌گیریم**، ولی `strict` را **فقط برای contracts** | Monshim `noImplicitAny:false` دارد؛ روشن کردنش روی ۲۶۵ فایل = صدها خطا. فقط پکیج جدید strict می‌شود |
| 4 | `packages/eslint-config` | 🟡 **فقط پلاگین‌ها/قواعد مشترک** | قاعدهٔ `strictTypeChecked` بک‌اند فعلاً ۲۳ خطا تولید می‌کند؛ انتقالش به پکیج مشترک آن را به فرانت هم سرریز می‌کند |
| 5 | `config/env.ts` با Joi + fail-fast | ✅ **می‌گیریم** | Monshim هیچ اعتبارسنجی env ندارد؛ `JWT_ACCESS_SECRET` فقط در لحظهٔ استفاده چک می‌شود |
| 6 | `common/bootstrap/setup-app.ts` | ✅ **می‌گیریم** | تست‌پذیری؛ الان همه در `main.ts` است و تست نمی‌شود |
| 7 | `HealthModule` (فقط DB + 503) | ✅ **می‌گیریم و توسعه می‌دهیم** | Monshim هیچ health ندارد. نسخهٔ Monshim باید Redis را هم جدا چک کند |
| 8 | `requestIdMiddleware` | ✅ **می‌گیریم** | برای ردیابی در لاگ و Sentry؛ بی‌ریسک |
| 9 | `LoggingInterceptor` | ✅ **می‌گیریم (اختیاری در Prod)** | فقط زمان پاسخ و status؛ با env قابل خاموش کردن |
| 10 | `DataSource` واحد (CLI = اپ) | ✅ **می‌گیریم** | امروز `seed.ts` یک `DataSource` جدا با `entities:[Province,City]` دارد که با اپ ناهماهنگ است |
| 11 | **TypeORM Migrations با `up/down`** | ✅ **می‌گیریم — با احتیاط شدید** | بزرگ‌ترین دستاورد برای Monshim. جزئیات بحرانی در ۳.۳ |
| 12 | `ipn deploy --prod` در Dockerfile | ✅ **می‌گیریم** | کاهش چشمگیر حجم ایمیج |
| 13 | `output: 'standalone'` فرانت | 🟡 **فقط اگر Docker را انتخاب کنیم** | Monshim با `inline-critical-css` روی `.next/server/app` کار می‌کند؛ سازگاری باید تست شود |
| 14 | `infra/` برای Docker | ✅ **می‌گیریم** | جداسازی زیرساخت از کد |
| 15 | **`ResponseInterceptor` با `success:true`** | ❌ **نمی‌گیریم** | ❗️ Monshim شکل `{status, message, data, pagination}` دارد و **۱۴۷ نقطه** در فرانت آن را مصرف می‌کند (`ApiSingleResponse` ۱۰۴ + `ApiListResponse` ۵۸ ارجاع). تغییر شکل = شکستن کل فرانت |
| 16 | `ApiErrorResponse` / `ErrorCode` | ❌ **نمی‌گیریم (فاز جداگانه)** | Monshim در `getApiErrorMessage` روی `data.message` و status کار می‌کند. افزودن `error.code` **فقط افزایشی** مجاز است، نه جایگزینی |
| 17 | `AppException` | ❌ **نمی‌گیریم** | `AllExceptionsFilter` موجود (که MySQL/Multer را map می‌کند) بهتر و مخصوص Monshim است |
| 18 | **API Versioning (`/api/v1`)** | ❌ **نمی‌گیریم** | ✅ **قبول دارم که اختلاف دارم:** هر دو پروژه را کامل خواندم. تصمیم بر این است که `/api/v1` در Monshim **تغییر مسیر است** و ریسک آن بیشتر از منفعت. برنامه جایگزین: هدر `X-API-Version` + `GET /api/version` + قاعدهٔ expand/contract |
| 19 | `BaseEntity` (UUID + soft delete + version) | ❌ **نمی‌گیریم** | Monshim `User.id` عددی و ۱۰ entity مختلف با `created_at` اختصاصی دارد. تحمیل UUID = Migration مخرب روی کلید اصلی |
| 20 | `timezone: 'Z'` (UTC) | ❌ **نمی‌گیریم** | Monshim توابع `booking-time.ts`/`bale-time.util.ts` مخصوص **تهران** دارد و `datetime` های موجود به وقت محلی ذخیره شده‌اند. تغییرش = **تغییر معنی داده‌های موجود** |
| 21 | `useSecurityHeaders()` | 🟡 **بعداً** | Monshim باید `nosniff` روی API بگذارد، اما `securityHeaders` کامل می‌تواند CORS/کوکی را بشکند؛ جداگانه و تست‌شده |
| 22 | ساختار `src/features` فرانت | ❌ **نمی‌گیریم — فقط الگو** | Monshim `components/pages/*` + `services/features/*` دارد و **۲۱۲ فایل** کامپوننت. جابه‌جایی آن ۳۰۰+ Import را می‌شکند و **صفر رفتار** را بهتر نمی‌کند |
| 23 | Husky + lint-staged | 🟡 **اختیاری در فاز آخر** | مفید، ولی چون ESLint فعلاً ۴۲ خطا دارد (P1-5 ممیزی قبل)، اول باید سبز شود |
| 24 | پورت ۳۳۳۳/۴۴۴۴ و `/api/v1` | ❌ **نمی‌گیریم** | Monshim روی ۳۰۰۲/۳۰۰۰ است. تغییر پورت = شکستن Nginx (شرط صریح شما) |

### ۳.۲ بخش‌هایی که باید در Monshim **باقی بمانند** (تغییر نمی‌کنند)

- `back/src/common/filters/all-exceptions.filter.ts` — منطق نگاشت MySQL/Multer
- `back/src/common/interceptors/response.interceptor.ts` — **شکل پاسخ دست‌نخورده**
- `back/src/auth/**` (کل ماژول) — به‌جز تغییر مسیر import
- `back/src/redis/**` + `session-revocation`
- `back/src/common/utils/{schema-guard,throttle-tracker,public-url,auth-cookie}`
- `front/services/api/**` — کل لایهٔ نشست
- `front/lib/{session-policy,session-cache,auth,auth-cookie-origin}`
- `front/app/**` — ساختار route group
- `front/next.config.ts` — منطقهای تصویر، `inline-critical-css`، rewriteها
- همهٔ ۹ فایل `back/sql/*.sql` (تا وقتی migration پایه تولید و **تأیید** شود)

### ۳.۳ ریسک ویژهٔ Migrations — چگونه بدون فاجعه انجام می‌شود

**بحرانی:** Monshim اکنون با `synchronize: NODE_ENV !== 'production'` کار می‌کند. دیتابیس Production با `synchronize:false` + ۹ فایل SQL دستی ساخته شده. اگر TypeORM Migration اضافه کنیم، **اولین migration باید دقیقاً وضعیت فعلی Production را توصیف کند**، نه بسازد.

**روش امن (فاز ۶):**
1. `mysqldump` کامل + **تست restore** روی یک دیتابیس دیگر (بدون این، هیچ کاری انجام نمی‌شود)
2. یک `data-source.ts` بسازیم و `migration:generate` را اجرا کنیم — اما **آن را اجرا نکنیم**
3. خروجی را به دو بخش تقسیم کنیم:
   - `up()` = «اگر جدول/ستون نبود بساز» (idempotent، `IF NOT EXISTS`)
   - `down()` = `throw new Error('irreversible')` برای تغییرات داده‌محور، و DROP فقط برای جدول‌های تازه
4. **baseline**: جدول `typeorm_migrations` را با یک INSERT دستی پر کنیم تا TypeORM فکر کند migration اجرا شده
5. فقط در **staging** روی کپی Production تست شود
6. `synchronize` **دست نخورد** — در dev همان‌طور می‌ماند تا توسعه قطع نشود

> ⚠️ **این فاز بدون تأیید صریح شما و بدون بکاپ، اجرا نمی‌شود.**

---

## ۴. تغییرات موردنیاز در Importها، Build، Runtime

### ۴.۱ Importها و Path Alias

| پروژه | امروز | بعد از مهاجرت |
|---|---|---|
| بک‌اند | `from 'src/common/...'` (۴۶۵ مورد، با `baseUrl:"./"`) | **همان** `src/...` حفظ می‌شود — `baseUrl` در `apps/api/tsconfig.json` می‌ماند |
| فرانت | `from '@/lib/...'` (alias در `tsconfig`) | **همان** `@/*` حفظ می‌شود |
| مشترک | نداشت | `from '@monshim/contracts'` |

**دلیل انتخاب `apps/api` و `apps/web` (نه `backend`/`frontend`):** با پکیج `@monshim/api`، مسیر `apps/api/src/...` همان `src/...` را حفظ می‌کند و **۴۶۵ import دست‌نخورده** می‌ماند. این بزرگ‌ترین ریسک مهاجرت را حذف می‌کند.

### ۴.۲ ریسک فنی کشف‌شده: `src/...` در Runtime

✅ **بررسی شد و مشکل نیست.** TypeScript `src/...` را در خروجی به مسیر نسبی (`../common/...`) تبدیل می‌کند. تأیید تجربی:
```
$ grep -rn 'require("src/' dist/  →  0 نتیجه
$ grep 'require(' dist/src/booking/booking.service.js  →  require("../bale/...")
```
پس **`baseUrl` فقط یک قابلیت زمان کامپایل است** و جابه‌جایی پوشه، تا وقتی `baseUrl` در tsconfig درست بماند، ایمن است.

### ۴.۳ Build

| بخش | امروز | بعد از |
|---|---|---|
| نصب | ۳ بار جدا، ۳ لاک‌فایل | یک‌بار از ریشه، یک لاک‌فایل |
| Build بک‌اند | `cd back && pnpm build` | `pnpm build:api` (توربو) |
| Build فرانت | `cd front && pnpm build` | `pnpm build:web` (توربو؛ `contracts` اول) |
| ترتیب | دستی | `turbo.json` با `dependsOn: ["^build"]` |

### ۴.۴ Runtime — آنچه باید **دقیقاً** حفظ شود

| مورد | مقدار فعلی (باید بماند) |
|---|---|
| پورت بک‌اند | `3000` (`PORT`) |
| پورت فرانت | `3002` (انتظار Nginx) |
| `start:prod` بک‌اند | `node dist/src/main` → در monorepo: `node dist/src/main` (همان) |
| `start` فرانت | `next start` (پورت با `-p` یا `PORT`) |
| `.env` بک‌اند | مسیر `back/.env` → **باید** `apps/api/.env` یا ریشه بماند؛ `ConfigModule` مسیر را صریح می‌گیرد |
| `uploads` | `back/uploads` (bind mount در compose) → **مسیر مطلق** توصیه می‌شود |
| Redis / MySQL | بدون تغییر |
| Nginx | `/` → 3002، `/api` + `/uploads` → 3000 — **دست‌نخورده** |

---

## ۵. تغییرات Docker و Deployment

### ۵.۱ وضعیت فعلی (شکسته/ناقص)

| مورد | مشکل |
|---|---|
| `back/dockerfile` | حروف کوچک؛ `docker-compose.yml` به `Dockerfile` اشاره می‌کند → `docker compose build` روی Linux **شکست می‌خورد** |
| فرانت | **هیچ Dockerfile ندارد** — فرانت با PM2 روی هاست اجرا می‌شود (استنتاج از پورت ۳۰۰۲ و نبود Dockerfile) |
| compose پروd | بدون `healthcheck` برای backend، بدون `depends_on`، بدون `mem_limit`، بدون `logging` |
| `uploads` | bind mount نسبی `./uploads` → با تغییر مسیر Deploy، تصاویر گم می‌شوند |
| پورت‌ها | `3307:3306`, `6381:6379`, `3000:3000` روی همهٔ اینترفیس‌ها |

### ۵.۲ پیشنهاد (فاز ۸ — اختیاری و **جدا** از Refactoring)

- انتقال Docker به `infra/`
- `Dockerfile` استاندارد با `pnpm deploy --prod`
- bind به `127.0.0.1` برای MySQL/Redis
- `healthcheck` روی `/api/health`
- `logging` با `max-size`

> **⚠️ تأکید:** این بخش **کاملاً جدا** از Refactoring است و **فقط با تأیید صریح** و در پنجرهٔ نگهداری انجام می‌شود. تغییر ساختار پوشه‌ها **نباید** هم‌زمان با تغییر Docker/Deploy باشد. اگر ترجیح می‌دهید Deploy را دست نزنید، Refactoring بدون فاز ۸ هم کامل است.

---

## ۶. ریسک‌های مهاجرت (با کاهش ریسک)

| # | ریسک | احتمال | تأثیر | کاهش |
|---|---|---|---|---|
| R1 | شکستن Importهای `src/...` | پایین | بالا | نگه‌داشتن `baseUrl` + اجرای `tsc` و `build` بعد از هر فاز |
| R2 | از دست رفتن `.env` هنگام جابه‌جایی | **متوسط** | **بالا** | `.env` **هرگز** جابه‌جا نمی‌شود؛ symlink یا کپی + تأیید دستی |
| R3 | تخریب دیتابیس با Migration | **بالا اگر بی‌احتیاط** | **فاجعه** | فاز ۶ جدا، بکاپ اجباری، baseline، فقط staging |
| R4 | شکستن API برای فرانت | **متوسط** | بالا | **هیچ تغییری در `Response`/مسیر/کد وضعیت** در این پروژه |
| R5 | شکستن Nginx (پورت/پروکسی) | متوسط | بالا | پورت‌ها دست‌نخورده؛ Docker جدا؛ چک‌لیست |
| R6 | از دست رفتن `uploads` | متوسط | بالا | مسیر مطلق + کپی تأییدشده قبل از هر جابه‌جایی |
| R7 | شکستن `inline-critical-css` (وابسته به `.next/server/app`) | متوسط | پایین | تست Build بعد از هر تغییر `distDir` |
| R8 | ناسازگاری نسخهٔ pnpm (۸ vs ۹) | بالا | پایین | یک نسخهٔ واحد در ریشه؛ بدون `--frozen-lockfile` تا بازسازی لاک‌فایل |
| R9 | کاهش سرعت توسعه در طول مهاجرت | بالا | متوسط | فازبندی؛ هر فاز مستقل قابل انتشار |
| R10 | افزودن ناخواستهٔ پیچیدگی (Turborepo) | متوسط | متوسط | Turborepo **اختیاری** است؛ workspace بدون turbo هم کار می‌کند |

### ۶.۱ اصل «توقف اضطراری»
هر فاز باید به‌تنهایی قابل **بازگشت با `git revert`** باشد. یعنی:
- هیچ فازی نباید هم‌زمان ساختار + منطق را تغییر دهد
- هیچ فازی نباید `.env`، دیتابیس یا Nginx را لمس کند (جز فاز ۶ و ۸ با تأیید جدا)

---

## ۷. معماری مقصد پیشنهادی (برای Monshim)

```
monshim/
├── package.json               ← workspaces + اسکریپت‌های ارکستریشن
├── pnpm-workspace.yaml
├── pnpm-lock.yaml             ← تنها لاک‌فایل
├── turbo.json                 ← (اختیاری)
├── .npmrc                     ← node-linker=hoisted (برای سازگاری Nest)
├── tsconfig.base.json
├── .env.example               ← مستندسازی همهٔ متغیرها
├── apps/
│   ├── api/                   ← همان back/ (تغییر نام + پاک‌سازی)
│   │   ├── src/
│   │   │   ├── main.ts              ← فقط bootstrap
│   │   │   ├── app.module.ts
│   │   │   ├── config/env.ts        ← ⭐ جدید: Joi + fail-fast
│   │   │   ├── common/
│   │   │   │   ├── bootstrap/setup-app.ts       ← ⭐ جدید
│   │   │   │   ├── health/health.controller.ts   ← ⭐ جدید
│   │   │   │   ├── middleware/request-id.ts      ← ⭐ جدید
│   │   │   │   ├── filters/  (موجود، دست‌نخورده)
│   │   │   │   ├── interceptors/ (response موجود + logging جدید)
│   │   │   │   ├── config/  utils/  guards/  query/  services/  seeds/
│   │   │   ├── database/            ← ⭐ جدید: data-source + migrations
│   │   │   └── modules/             ← ۲۰ ماژول فعلی، بدون تغییر منطق
│   │   └── sql/                     ← حفظ می‌شود (مرجع تاریخی)
│   └── web/                   ← همان front/ (تغییر نام + پاک‌سازی)
│       └── (ساختار فعلی حفظ می‌شود)
├── packages/
│   ├── contracts/             ← ⭐ قیمت‌گذاری + انواع مشترک + ارقام/کدملی
│   ├── tsconfig/
│   └── eslint-config/
├── infra/
│   └── docker/                ← (فاز ۸، اختیاری)
└── docs/
```

### ۷.۱ محتوای پیشنهادی `packages/contracts` (فقط چیزهایی که **واقعاً** تکراری‌اند)

```
packages/contracts/src/
├── index.ts
├── money/
│   ├── commission.ts      ← normalizeCommissionTiers, computeProgressiveCommission
│   ├── pricing.ts         ← computeServicePricing, computeOrderPricing
│   └── pricing.spec.ts    ← تست مشترک (۳۲۵ تست موجود + تست‌های منتقل‌شده)
├── persian/
│   ├── digits.ts          ← toPersianDigits, toEnglishDigits (نسخهٔ واحد)
│   ├── national-code.ts   ← isValidIranianNationalCode, normalizeNationalCode
│   └── phone.ts           ← isValidIranMobile, normalizeIranMobile
└── api/
    └── response.ts        ← ApiSingleResponse, ApiListResponse, PaginationMeta (فقط type)
```

**قاعدهٔ سخت:** `contracts` **هیچ** وابستگی به Nest، Next، TypeORM، یا `process.env` ندارد. فقط محاسبه و type.

**نکتهٔ حساس دربارهٔ `extractBaseDepositToken`:** دو نسخه **رفتار متفاوت** دارند (نسخهٔ بک‌اند یک `regex` اعتبارسنجی اضافه دارد). طبق قانون «کدهای مشابه را بدون بررسی تفاوت رفتار ادغام نکن»، این تابع **در contracts نمی‌رود** مگر پس از تصمیم شما دربارهٔ کدام رفتار درست است. (پیشنهاد من: نسخهٔ سخت‌گیرانه‌تر بک‌اند، چون ورودی کاربر است.)

---

## ۸. پاسخ مستقیم به پرسش‌های شما

**«آیا ساختار جدید در همان سرور فعلی اجرا می‌شود؟»**
بله. تغییرات **صفر** وابستگی سیستمی جدید اضافه می‌کند (Node 22 و pnpm که همین حالا لازم‌اند). `Turborepo` **اختیاری** است و می‌تواند حذف شود.

**«آیا Nginx / پورت / SSL تحت تأثیر قرار می‌گیرد؟»**
خیر. پورت‌ها (۳۰۰۰/۳۰۰۲) و مسیرهای `/api` و `/uploads` **دست‌نخورده** می‌مانند. فقط مسیر پوشهٔ کد روی دیسک عوض می‌شود — که Nginx به آن کاری ندارد.

**«آیا دیتابیس تغییر می‌کند؟»**
**در فازهای ۱–۵ و ۷–۹: خیر، صفر تغییر.** فاز ۶ (Migrations) **جدا** و مشروط به تأیید شما + بکاپ است. Refactoring ساختاری و Migration **عمداً تفکیک شده‌اند**.

**«آیا API تغییر می‌کند؟»**
خیر. شکل پاسخ، مسیرها، کدهای وضعیت و نام فیلدها **دست‌نخورده**. تنها افزایش مجاز: افزودن هدر `X-Request-Id` و اندپوینت جدید `/api/health` (که چیزی را حذف نمی‌کند).

**«ریسک اصلی چیست؟»**
۱) فراموش‌شدن `.env` در انتقال، ۲) Migration بی‌احتیاط. برای هر دو، دروازهٔ سخت تعریف شده است.
