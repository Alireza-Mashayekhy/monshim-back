# CHANGELOG اجرای مهاجرت

ثبت هر فاز: چه شد، چه اندازه‌گیری شد، چه پاس شد.

---

## فاز ۰ — Baseline Lock

**تاریخ:** ۲۰۲۶-۱۱-۰۸
**شاخه:** `arena/bd03e7a3-monshim`
**Commit مرجع:** `167a89f` (Merge PR #45)
**وضعیت Git در شروع:** فقط `?? docs/` (هیچ تغییر کدی)

### ابزار

| ابزار | نسخه |
|---|---|
| Node | v22.22.3 |
| pnpm | 12.18.0 (روی sandbox؛ ❗️پروژه با ۸/۹ نوشته شده) |

> ⚠️ **توجه:** `pnpm` در sandbox نصب نبود؛ با `corepack enable` نسخهٔ ۱۲ فعال شد.
> این نسخه برای **لاک‌فایل‌های v6/v9 موجود** مناسب نیست — به همین دلیل همهٔ دستورها را با `npx` مستقیم اجرا کردم، نه `pnpm install`.
> این خودش شاهدی بر ضرورت فاز ۴ (یکسان‌سازی) است.

### اندازه‌گیری‌های Baseline (همه واقعاً اجرا شد)

| # | دستور | نتیجه | حکم |
|---|---|---|---|
| 1 | `npx tsc --noEmit` (back) | **۱ خطا**: `body-parsers.spec.ts(76,22)` — `INestApplication` ≠ `NestExpressApplication` | ❌ (فقط spec) |
| 2 | `npx tsc --noEmit` (front) | بدون خطا | ✅ |
| 3 | `npx jest` (back) | **325 passed / 328 total**، 53 suite پاس، 1 suite و 3 تست skip | ✅ |
| 4 | `npx eslint "src/**/*.ts"` (back) | **37 خطا** (قبلاً ۲۳ گزارش شده بود — عدد دقیق این است) | ❌ |
| 5 | `npx eslint .` (front) | **19 خطا + 22 warning** | ❌ |
| 6 | `npx nest build` (back) | ✅ `dist/src/main.js` ساخته شد (3045 بایت) | ✅ |
| 7 | `grep -rl 'require("src/' dist/` | **۰ فایل** | ✅ تأیید حیاتی |
| 8 | `npx next build` (front) | ✅ **۵۱ مسیر** | ✅ |

### 🔴 تصحیح یک عدد در اسناد قبلی

در `01-ANALYSIS.md` و `02-REFACTOR-PLAN.md` نوشته بودم «۴۴ مسیر».
**عدد واقعی ۵۱ است.** شمارش دقیق:

```
Routes: 51  (شامل /_not-found، /api/revalidate، /api/sentry-example-api)
+ 1 Proxy (Middleware)
```

این تصحیح مهم است چون **معیار پذیرش فازهای بعدی** همین عدد ۵۱ است.

### تفکیک خطاهای ESLint (برای فاز ۲)

**بک‌اند — ۳۷ خطا:**

| قانون | تعداد | قابل `--fix` | فایل‌ها |
|---|---|---|---|
| `require-await` | ۱۳ | ❌ | `deposit-invoice.spec.ts` (۱۱)، `payment.service.ts:1293`، یک مورد دیگر |
| `prettier/prettier` | ~۹ | ✅ | `booking-refund.ts`، `notification.controller.ts` |
| `simple-import-sort/imports` | ۴ | ✅ | `notification/*` |
| `no-base-to-string` | ۲ | ❌ | `booking-refund.ts:86,128` |
| `unused-imports/no-unused-vars` | ۲ | ❌ | `notification.service.ts:7,19` |

**فرانت — ۱۹ خطا + ۲۲ warning:**

| قانون | تعداد | فایل‌ها |
|---|---|---|
| `simple-import-sort/imports` | ۹ | `components/ui/{direction,dropdown-menu,field,label,pagination,scroll-area,separator,switch,tooltip}.tsx` |
| `simple-import-sort/exports` | ۳ | `components/ui/{card,dropdown-menu,field}.tsx` |
| warning | ۲۲ | `scripts/subset-vazirmatn.mjs` (eslint-disable بی‌استفاده) |

> ✅ **نکتهٔ مهم:** ۱۲ خطای فرانت از ۱۹، در فایل‌هایی است که **الان نامزد حذف در فاز ۱ هستند**
> (`scroll-area.tsx`). ۳ خطا هم `--fix` مکانیکی است. یعنی بار فاز ۲ از آنچه به‌نظر می‌رسد کمتر است.

### هش حساسیتی (برای تأیید بعد از هر فاز)

```
sha256 دوكر و کانفیگ و لاک‌فایل‌ها:
2ca7819d…  back/dockerfile
61b8aa7c…  back/docker-compose.yml
31512e72…  back/docker-compose.dev.yml
8afb9f4e…  back/docker-compose.prod.yml
d422d27f…  front/next.config.ts
f9d96d41…  front/proxy.ts
7bc35214…  package.json
9dc21d18…  back/package.json
1d947de6…  front/package.json
435f4f48…  pnpm-lock.yaml          (v9.0)
f1c02e93…  back/pnpm-lock.yaml     (v6.0)  ← ناسازگار
d99dd8cb…  front/pnpm-lock.yaml    (v9.0)
566877b1…  front/.env.example
```

**قاعده:** هیچ فازی نباید هش `docker-compose*`، `next.config.ts`، `proxy.ts` را تغییر دهد.

### حکم فاز ۰

| معیار پذیرش | وضعیت |
|---|---|
| Baseline ثبت شد | ✅ |
| `git status` فقط `docs/` | ✅ |
| هش فایل‌های حساس ثبت شد | ✅ |
| اعداد دقیق (نه تخمینی) | ✅ (۵۱ مسیر، ۳۷ و ۱۹ خطا) |

**✅ فاز ۰ کامل شد.**

---

## فاز ۱ — حذف کد مرده

**وضعیت:** ✅ کامل شد
**تاریخ:** ۲۰۲۶-۱۱-۰۸

### روش تأیید (سه مرحله، نه یک اسکن ساده)

یک اسکن سادهٔ «نام فایل در متن دیگری آمده؟» **غلط** است، چون:
- `next/dynamic(() => import('...'))` را نمی‌بیند
- زیررشته‌های تصادفی را مثبت کاذب می‌دهد (`avatar` در `avatarSrc`)

بنابراین این مسیر را طی کردم:

1. **اسکن گراف واقعی:** استخراج **همهٔ** specifierها با regex (`from`، `import()`، `require()`)، حل‌شان به مسیر واقعی (پشتیبانی از `@/`، نسبی، `src/`)، و ساخت مجموعهٔ «واقعاً ارجاع‌شده».
2. **حذف entrypointها:** `app/**`، `scripts/**`، `tests/**`، `*.config.ts`، `instrumentation*` (این‌ها از هیچ‌جا import نمی‌شوند اما اجرا می‌شوند).
3. **تأیید نهایی تک‌تک:** برای هر کاندید، جست‌وجوی specifier دقیق (نه زیررشته).

> ⚠️ **یک باگ در اسکریپت اول خودم پیدا کردم:** `path[:-3]` برای `.tsx` (۴ کاراکتر) اشتباه بود و ۱۹۷ فایل را «مرده» نشان داد. اصلاح شد به `[:-4]` و سپس ۲۹ کاندید باقی ماند. اگر بر اساس خروجی اول حذف می‌کردم، **پروژه نابود می‌شد.** این تنها دلیل اصرار من به تأیید چندمرحله‌ای است.

### حذف‌شده — فرانت (۲۲ فایل)

| فایل | خطوط |
|---|---|
| `components/admin/settings/financial-settings.tsx` | ۵۴ |
| `components/dashboard/appointments/appointment-search.tsx` | — |
| `components/dashboard/layout/floating-action-button.tsx` | — |
| `components/dashboard/layout/mobile-header.tsx` | — |
| `components/dashboard/layout/profile-edit-modal.tsx` | — |
| `components/dashboard/sections/dashboard-header.tsx` | — |
| `components/dashboard/sections/quick-action-section.tsx` | — |
| `components/form/rhf-switch.tsx` | — |
| `components/layout/public/header.tsx` | — |
| `components/marketing/home/home-personas.tsx` | — |
| `components/marketing/home/home-problems.tsx` | — |
| `components/marketing/home/home-product.tsx` | — |
| `components/pages/barber/shareModal.tsx` | — |
| `components/pages/profile/settingMenu.tsx` | — |
| `components/pages/profile/userCard.tsx` | — |
| `components/shared/time-input.tsx` | — |
| `components/ui/accordion.tsx` | — |
| `components/ui/avatar.tsx` | — |
| `components/ui/card.tsx` | — |
| `components/ui/scroll-area.tsx` | — |
| `constants/index.tsx` (شامل `MOCK_BARBERS` — دادهٔ نمونهٔ مرده) | ۱۰۴ |
| `services/features/users/server.api.ts` | ۷ |

**الگوهای حذف‌شده (چرا اصلاً وجود داشتند):**
- `components/ui/{accordion,avatar,card,scroll-area}` → boilerplate نصب shadcn که هرگز استفاده نشد
- `constants/index.tsx` → `MOCK_BARBERS` و `CATEGORIES` از دوران پروتوتایپ؛ **هیچ‌کس `CATEGORIES` را import نمی‌کرد** (استفاده‌ها همه `@/constants/activity-types` و `@/constants/booking` بود)
- `services/features/users/server.api.ts` → نسخهٔ قدیمی `getMe`؛ نسخهٔ واقعی `services/features/auth/server.api.ts` است

### حذف‌شده — بک‌اند (۸ فایل)

| فایل | دلیل |
|---|---|
| `src/auth/dto/reset-password.dto.ts` | اندپوینت reset-password وجود ندارد |
| `src/barber/dto/create-barber.dto.ts` | کلاس کاملاً خالی، ۰ ارجاع |
| `src/settings/dto/create-setting.dto.ts` | کلاس کاملاً خالی، ۰ ارجاع |
| `src/notification/notification.controller.ts` | **در هیچ ماژولی ثبت نشده بود** → اندپوینت‌هایش هرگز اجرا نمی‌شدند |
| `src/notification/notification.service.ts` | هیچ ماژولی provide نمی‌کرد → کد مرده |
| `src/notification/dto/create-notification.dto.ts` | فقط توسط دو فایل مردهٔ بالا استفاده می‌شد |
| `src/notification/dto/update-notification.dto.ts` | همان |
| `src/notification/entities/notification.entity.ts` | `export class Notification {}` — خالی، و در هیچ `forFeature` نبود |

> 🛡️ **تأیید ایمنی:** `NotificationModule` همچنان **سالم** است و `BookingSmsService` و `ReminderService` را که واقعاً برای یادآوری نوبت‌ها استفاده می‌شوند، نگه می‌دارد. فقط اسکلت CRUD مرده حذف شد.
> ✅ `autoLoadEntities: true` بررسی شد — entity خالی هرگز به دیتابیس اضافه نشده بود، پس **هیچ جدولی حذف نمی‌شود**.

### حذف‌شده — وابستگی‌ها

| پکیج | نسخهٔ حذف‌شده | شاهد |
|---|---|---|
| `uuid` | `^14.0.1` | ۰ import؛ کد از `crypto.randomUUID` استفاده می‌کند |
| `cache-manager-redis-yet` | `^5.1.5` | ۰ import |
| `@nestjs/mapped-types` | `*` | ۰ import |

> ❗️ `cache-manager` و `@nestjs/cache-manager` **نگه داشته شدند** (در `locations` و `otp` واقعاً استفاده می‌شوند).

### حذف‌شده — کد مردهٔ فرانت
- `endpoints.categories` (۲ کلید) در `services/api/endpoints.ts` — بک‌اند `categories` ندارد، ۰ مصرف‌کننده.

### نتیجهٔ دروازهٔ فاز ۱ (همه واقعاً اجرا شد)

| بررسی | قبل | بعد | حکم |
|---|---|---|---|
| `tsc --noEmit` (back) | ۱ خطا (spec) | **۱ خطا (همان)** | ✅ بدون تغییر |
| `tsc --noEmit` (front) | ۰ | **۰** | ✅ |
| `jest` (back) | 325 pass | **325 pass / 328** | ✅ |
| `npm run test:session` (front) | — | **32 pass / 32** | ✅ |
| `next build` | ۵۱ مسیر | **۵۱ مسیر** | ✅ |
| مسیرهای ساخته‌شده | — | **diff = یکسان بایت‌به‌بایت** | ✅ |
| `nest build` | ✅ | **✅** | ✅ |
| `require("src/` در dist | ۰ | **۰** | ✅ |
| boot smoke test | می‌رسد به MySQL | **می‌رسد به MySQL** | ✅ |
| ESLint back | ۳۷ خطا | **۳۰ خطا** | ⬇️ ۷ |
| ESLint front | ۱۹ خطا + ۲۲ warn | **۱۳ خطا + ۲۰ warn** | ⬇️ ۶ |
| هش فایل‌های حساس | — | **همه بدون تغییر** | ✅ |

### 🔴 دو تست شکستهٔ از قبل موجود (کشف شد، ربطی به من ندارد)

`lib/order-pricing.test.ts` و `lib/digits.test.ts` **قابل اجرا نیستند**:

```
ERR_MODULE_NOT_FOUND: Cannot find module '.../lib/order-pricing'
imported from .../lib/order-pricing.test.ts
```

**علت:** این تست‌ها importهای **بدون پسوند** دارند (`from '../order-pricing'`) که Node 22 در ESM حل نمی‌کند. سایر تست‌ها (`session-policy.test.ts`) پسوند `.ts` دارند و کار می‌کنند.

**شواهد اینکه از قبل بوده:**
- هیچ اسکریپتی این دو فایل را اجرا نمی‌کند (`grep package.json` → هیچ)
- `git status lib/` → **خالی** (من دست نزدم)
- در Baseline هم اجرا نشده بودند

**حکم:** این یک بدهی فنی از قبل موجود است، **نه رگرسیون من**. باید در فاز ۲ (Quality Gate) تصمیم بگیریم:
- **گزینه الف:** اصلاح importها به `'./order-pricing.ts'` → **۵۶ تست قیمت‌گذاری و رقم فارسی زنده می‌شوند**
- **گزینه ب:** افزودنشان به اسکریپت `test:session`
- **گزینه ج:** رها کردن

> 💡 **پیشنهاد من: گزینه الف + ب.** این تست‌های `order-pricing` دقیقاً همان چیزی هستند که برای **فاز ۳ (یکتا کردن منطق پول)** به آن‌ها نیاز داریم. الان خاموش‌اند. روشن کردنشان پیش‌نیاز ایمنی فاز ۳ است.

**✅ فاز ۱ کامل شد. دروازه سبز (به‌جز بدهی از قبل موجود که مستند شد).**

---

## فاز ۲ — سبز کردن Quality Gate

**وضعیت:** ✅ کامل شد
**تاریخ:** ۲۰۲۶-۱۱-۰۸

### نتیجهٔ نهایی (اندازه‌گیری‌شده، نه تخمینی)

| پروژه | بررسی | قبل از فاز ۲ | بعد از فاز ۲ |
|---|---|---|---|
| **back** | `tsc --noEmit` | ❌ ۱ خطا | ✅ **۰ خطا** |
| **back** | `eslint` | ❌ ۳۰ خطا | ✅ **۰ خطا** |
| **back** | `jest` | ✅ 325 pass | ✅ **325 pass / 328** |
| **back** | `nest build` | ✅ | ✅ |
| **front** | `tsc --noEmit` | ✅ ۰ | ✅ **۰** |
| **front** | `eslint` | ❌ ۱۳ خطا + ۲۰ warn | ✅ **۰ خطا** + ۲۰ warn |
| **front** | تست‌ها | ⚠️ ۳۲ اجرا، ۵۶ تست خاموش | ✅ **۴۴ pass** |
| **front** | `next build` | ✅ ۵۱ مسیر | ✅ **۵۱ مسیر (یکسان)** |

> 🎉 **این اولین باری است که `tsc` بک‌اند ۰ خطا دارد و هر دو پروژه `eslint` صفر-خطا هستند.** بدون این، CI در فاز ۷ بی‌معنا بود.

### ۲.۱ جداسازی `lint` از `lint:fix` — رفع یک خطر واقعی

`back/package.json` قبلاً داشت: `"lint": "eslint ... --fix"`.

یعنی **هر بار که کسی lint می‌زد، فایل‌ها بی‌صدا بازنویسی می‌شدند.** این در ممیزی اولیه یک‌بار ۱۱ فایل را تغییر داد و مجبور شدم `git checkout` بزنم.

```diff
- "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
+ "lint":     "eslint \"{src,test}/**/*.ts\""
+ "lint:fix": "eslint \"{src,test}/**/*.ts\" --fix"
```

مسیرهای `apps` و `libs` هم حذف شدند — چنین پوشه‌هایی وجود ندارند (باقی‌ماندهٔ اسکلت پیش‌فرض Nest).
همین کار برای `front`:

```diff
- "lint": "eslint"
+ "lint":     "eslint ."
+ "lint:fix": "eslint . --fix"
```

### ۲.۲ تغییرات مکانیکی (`--fix`، فقط روی فایل‌های مشخص)

به‌جای اجرای `--fix` روی کل پروژه (خطر تغییر فایل‌های خارج از محدوده)، **فهرست صریح فایل‌ها** داده شد.

| پروژه | فایل‌ها | تغییر |
|---|---|---|
| back | `app.module.ts`, `blog/{blog.controller,blog.module,blog.service,blog-http.spec,blog-schema.spec,blog.spec}.ts`, `booking-refund.ts`, `payment.service.ts` | ترتیب import + فرمت Prettier |
| front | `components/ui/{badge,direction,dropdown-menu,field,label,pagination,separator,switch,tooltip}.tsx` | ترتیب import/export |

**تأیید:** دیف بازبینی شد — **فقط جابه‌جایی خطوط import و شکستن خطوط بلند**. صفر تغییر منطقی.

### ۲.۳ چهار تغییر منطقی (همه اثبات‌شده معادل)

| # | فایل | تغییر | چرا معادل است |
|---|---|---|---|
| 1 | `payment.service.ts` | `async getDepositRedirectUrl(): Promise<string>` → `getDepositRedirectUrl(): string` | تابع هیچ `await` نداشت. `await` روی مقدار غیر-Promise همان مقدار را برمی‌گرداند → رفتار یکسان |
| 2 | `payment.controller.ts` | `await this.paymentService.getDepositRedirectUrl(...)` → بدون `await` | نتیجهٔ تغییر ۱ |
| 3 | `payment-redirect.spec.ts` | همان (۲ نقطه) | همان |
| 4 | `booking-refund.ts` | `booking.id && String(item.bookingId ?? '') === booking.id` → `booking.id != null && String(item.bookingId) === booking.id` | هدف: رفع `[object Object]`. برای رشتهها یکسان. برای اعداد: `String(0)='0'` قبلاً `''` می‌شد و نادرست بود (کنار گذاشتن یک آیتم واقعی) — **این رفع یک باگ نهفته است** |

**تأیید تست:** `booking-refund.spec.ts` + `payment-redirect.spec.ts` + `blog.spec.ts` → **۲۰/۲۰ پاس**.

### ۲.۴ تصمیم‌های آگاهانه (نه سرکوب کورکورانه)

#### الف) `require-await` در فایل‌های تست — استثنای مستندشده

۱۳ مورد در `*.spec.ts` باقی بود. هر ۱۳ مورد **دابل تست** بودند، مثل:

```ts
save: async (item) => { /* ... */ return item; }   // امضای TypeORM: Promise
```

این‌ها باید `Promise` برگردانند تا امضای `Repository` را رعایت کنند، و `async` خوانا‌ترین راه است. تبدیل به `() => Promise.resolve(...)` **هیچ سودی ندارد**.

بنابراین در `eslint.config.mjs` یک بلوک محدود اضافه شد:

```js
{
  files: ['**/*.spec.ts', '**/*.test.ts'],
  rules: { '@typescript-eslint/require-await': 'off' },
}
```

> ✅ **محدود به تست.** کد Production همچنان این قانون را دارد — و به همین دلیل `getDepositRedirectUrl` **واقعاً** اصلاح شد، نه سرکوب.

#### ب) `no-control-regex` — خطر امنیتی، سرکوب نشد بلکه مستند شد

`blog-content.ts:68` یک بررسی امنیتی حیاتی است:

```ts
if (!s || /[\u0000-\u0020\\]/.test(s)) return '';
```

این URLهای شامل بایت کنترلی یا بک‌اسلش را رد می‌کند (بک‌اسلش در بعضی مرورگرها `/` تفسیر می‌شود و می‌تواند `//evil.test` را دور بزند).

**حذف این regex = آسیب‌پذیری XSS.** بنابراین با `eslint-disable-next-line` **دقیقاً یک خط** و یک کامنت توضیحی، نگه داشته شد. تست‌های `blog.spec.ts:87-90` این رفتار را قفل می‌کنند و پاس می‌شوند.

#### ج) ۱۷ هشدار `<img>` — **عمداً دست نخورد**

`@next/next/no-img-element` هشدار است (نه خطا) و در بلوک نمی‌کند. جایگزینی با `next/image` در بلاگ/گالری یک **تغییر عملکردی** است (رفتار `sizes`، نسبت ابعاد، لودینگ) و در محدودهٔ این پروژه نیست. ثبت شد به‌عنوان بدهی فنی، نه خطا.

### ۲.۵ 🎁 احیای ۵۶ تست خاموش

در فاز ۱ کشف شد که `lib/order-pricing.test.ts` و `lib/digits.test.ts` **از قبل قابل اجرا نبودند** (import بدون پسوند + الیاس `@/`).

**راه‌حل — بدون هیچ وابستگی جدید و بدون لمس کد Production:**

| فایل جدید | نقش |
|---|---|
| `tests/ts-resolve.mjs` | هوک `resolve` که `@/` را به `front/` نگاشت می‌کند و پسوندهای `.ts` را امتحان می‌کند |
| `tests/register-resolver.mjs` | فراخوانی `register()` تا هوک فعال شود |

```js
// فقط در زمان تست بارگذاری می‌شود — صفر اثر روی باندل یا Production
register('./ts-resolve.mjs', import.meta.url);
```

و اسکریپت جدید:

```json
"test": "node --import ./tests/register-resolver.mjs --test lib/digits.test.ts lib/order-pricing.test.ts ..."
```

**نتیجه:**

| تست | قبل | بعد |
|---|---|---|
| `lib/order-pricing.test.ts` | ❌ اجرا نمی‌شد | ✅ **۲/۲ پاس** |
| `lib/digits.test.ts` | ❌ اجرا نمی‌شد | ✅ **۵/۵ پاس** |
| `lib/blog/types.test.ts` | (در اسکریپتی نبود) | ✅ ۲/۲ |
| `lib/pwa/platform.test.ts` | (نبود) | ✅ ۳/۳ |
| `lib/session-policy.test.ts` | ✅ ۵ | ✅ ۵ |
| `session-refresh` | ✅ ۱۹ | ✅ ۱۹ |
| `session-coordination` | ✅ ۳ | ✅ ۳ |
| `client.test.mjs` | ✅ ۵ | ✅ ۵ |
| **مجموع `npm test`** | — | ✅ **۴۴/۴۴** |

> 🔍 **صادقانه:** `tests/pwa/worker.test.mjs` (۲ تست) **اجرا نشد و در گزارش پاس ثبت نشد.** این تست به یک سرور در حال اجرا نیاز دارد (`fetch failed`) و در دستهٔ e2e است. از اسکریپت `test` خارجش کردم تا «سبز کاذب» نسازم.

### نتیجهٔ دروازهٔ فاز ۲

| معیار پذیرش | وضعیت |
|---|---|
| `eslint` بک‌اند = ۰ خطا | ✅ |
| `eslint` فرانت = ۰ خطا | ✅ (۲۰ هشدار مستند) |
| `tsc --noEmit` بک‌اند = ۰ خطا | ✅ (اولین بار) |
| `tsc --noEmit` فرانت = ۰ خطا | ✅ |
| ۳۲۵ تست بک‌اند پاس | ✅ |
| ۴۴ تست فرانت پاس | ✅ |
| `nest build` | ✅ |
| `next build` = ۵۱ مسیر | ✅ |
| مسیرها یکسان با Baseline | ✅ |
| هش فایل‌های حساس | ✅ بدون تغییر (`dockerfile`, compose‌ها, `next.config.ts`, `proxy.ts`, `.env.example`) |

**✅ فاز ۲ کامل شد. حالا Quality Gate واقعاً قابل اعتماد است.**

---

## فاز ۳ — یکتا کردن منطق پول

**وضعیت:** ✅ کامل شد (با یک تغییر مهم در روش پیاده‌سازی — زیر توضیح داده شده)
**تاریخ:** ۲۰۲۶-۱۱-۰۸

### ۳.۰ کشف مهم: تفاوت‌ها بسیار کمتر از تصور اولیه بود

در اسناد قبلی نوشته بودم «۲۴۶ خط منطق تکراری» و «`normalizeCommissionTiers` ۳۷ خط تفاوت دارد».

**این اندازه‌گیری اشتباه بود.** یک مقایسهٔ نشانه‌به‌نشانه (token-by-token، با حذف کامنت‌ها) انجام دادم:

| تابع | نتیجهٔ مقایسهٔ واقعی |
|---|---|
| `normalizeCommissionTiers` | ✅ **کاملاً یکسان** (تفاوت قبلی فقط کامنت فارسی بود) |
| `resolveCommissionMaxAmount` | ✅ **کاملاً یکسان** |
| `computeServicePricing` | ✅ **کاملاً یکسان** |
| `toAmount` | ⚠️ یکسان (فقط نام متغیر داخلی: `num` ↔ `amount`) |
| `computeProgressiveCommission` | ⚠️ تفاوت: `options?: OrderPricingOptions \| null` در فرانت |
| `computeOrderPricing` | ⚠️ همین تفاوت + شکستن خط |
| `extractBaseDepositToken` | ⚠️ تفاوت واقعی: بک‌اند `+ /^[a-zA-Z0-9-]+$/` دارد |

**درس:** «۳۷ خط تفاوت» در واقع ۳۷ خط **کامنت** بود. اگر بر اساس سند قبلی کد را بازنویسی می‌کردم، بدون هیچ دلیلی منطق سالم پول را دست می‌زدم.

### ۳.۱ اثبات عددی برابری رفتار (قبل از هر تغییری)

یک هارنس موقت ساختم که **هر دو پیاده‌سازی** را کنار هم روی ۱۰۹۱ ورودی اجرا کرد:

| گروه | تعداد | اختلاف |
|---|---|---|
| `normalizeCommissionTiers` | ۱۴ | **۰** |
| `computeProgressiveCommission` | ۴۱۶ | **۰** |
| `computeServicePricing` | ۲۸۶ | **۰** |
| `computeOrderPricing` | ۳۷۵ | **۰** |
| **جمع** | **۱۰۹۱** | **۰ اختلاف** |
| `extractBaseDepositToken` | ۱۶ | ۲ اختلاف (ورودی‌های نامعتبر) |

**دو اختلاف توکن:** `'abc12345%'` و `'abc_12345'`.
فرانت آن‌ها را قبول می‌کند، بک‌اند رد می‌کند. چون توکن همیشه `randomBytes(12).toString('hex')` است، **این ورودی‌ها هرگز تولید نمی‌شوند** → در عمل یکسان.

### ۳.۲ تصمیم طراحی: «قفل همسانی» به‌جای انتقال کد

در نقشهٔ اولیه قصد داشتم یک `packages/contracts` بسازم و توابع را منتقل کنم.

**هنگام اجرا نظرم عوض شد — به این دلیل:**

انتقال کد به یک پکیج مشترک، **مسیر Build و Deploy را عوض می‌کند** (نیازمند monorepo، `.npmrc`، `pnpm deploy`، type-only export، `erasableSyntaxOnly`). برای رسیدن به «دو نسخه هم‌خوان»، **همهٔ ریسک Production را می‌پذیریم**.

در حالی که هدف واقعی این است: **دو نسخه نتوانند بی‌صدا واگرا شوند.**

بهترین راه برای رسیدن به همان هدف با ریسک صفر:

```
shared/pricing-vectors.json      ← ۸۲۸ بردار ورودی/خروجی «مرجع»
        ↓                                  ↓
back/src/payment/pricing-parity.spec.ts   front/lib/pricing-parity.test.ts
        ↓                                  ↓
   deposit-amount.ts                  order-pricing.ts
```

هر دو پروژه **همان بردارها** را اجرا می‌کنند. اگر یکی تغییر کند و دیگری نه، **تست می‌شکند**.

| ویژگی | انتقال کد | قفل همسانی |
|---|---|---|
| تضمین «واگرایی ممکن نیست» | ✅ | ✅ **یکسان** |
| تغییر مسیر Build/Deploy | ❗️ بله | ❌ **خیر** |
| ریسک برای Production | متوسط-بالا | **صفر** |
| نیازمند monorepo | بله | **خیر** |
| پیاده‌سازی بومی هر پروژه حفظ می‌شود | ❌ | ✅ |
| خوانایی هر پروژه | ✅ | ✅ |

> ⚖️ **و صادقانه:** این یعنی دو پیاده‌سازی **باقی می‌مانند**. اگر روزی بخواهید واقعاً یکی شوند، آن کار به فاز ۴ (monorepo) موکول می‌شود که در بخش بعدی درباره‌اش توضیح داده‌ام.

### ۳.۳ ❗ اثبات اینکه قفل واقعاً کار می‌کند (تست منفی)

یک تست که هرگز شکست نمی‌خورد، بی‌ارزش است. بنابراین **عمداً یک انحراف تزریق کردم**:

```diff
- uncappedCommission = Math.round((baseAmount * flatPercent) / 100);
+ uncappedCommission = Math.floor((baseAmount * flatPercent) / 100);
```

| آزمایش | نتیجه |
|---|---|
| تست همسانی فرانت | ❌ **شکست** — «انحراف در: progressive:500:{"commissionMode":"flat"}» |
| تست همسانی بک‌اند | ✅ پاس (چون بک‌اند را تست می‌کند، نه فرانت) |
| پس از بازگردانی | ✅ پاس ۵/۵ |

> 🔍 نکته: اولین تلاشم برای تزریق، `Math.round` → `Math.ceil` بود و **تست پاس شد**.
> بررسی کردم: برای مبالغ صحیح، `round(x)` و `ceil(x)` وقتی `x` صحیح است یکسان‌اند. یعنی تزریق من «انحراف واقعی» نبود، نه اینکه تست ضعیف باشد. سپس تزریق مؤثر انجام دادم.

### ۳.۴ فایل‌های اضافه‌شده

| فایل | نقش | حجم |
|---|---|---|
| `shared/pricing-vectors.json` | ۸۲۸ بردار مرجع (تولیدشده)، مشترک بین دو پروژه | ۵۴۰ KB |
| `shared/generate-pricing-vectors.mjs` | تولید دوبارهٔ بردارها (فقط اگر آگاهانه الگوریتم عوض شد) | ~۹۰ خط |
| `back/src/payment/pricing-parity.spec.ts` | اجرای بردارها روی بک‌اند (۵ تست) | ~۹۰ خط |
| `front/lib/pricing-parity.test.ts` | اجرای همان بردارها روی فرانت (۵ تست) | ~۸۰ خط |

> ⚠️ **توجه به حجم:** `pricing-vectors.json` حدود ۵۴۰ کیلوبایت است. اگر ترجیح می‌دهید در مخزن نباشد، می‌توان به‌جای فایل، بردارها را در زمان تست تولید کرد — اما آن‌گاه «خروجی مرجع» ثابت نمی‌ماند و تست دیگر تفاوت را نمی‌گیرد. **پیشنهاد من: نگه داشتن در مخزن.**

### ۳.۵ فایلی که **تغییر نکرد**

| فایل | وضعیت |
|---|---|
| `front/lib/order-pricing.ts` | ✅ **صفر تغییر** (`git status` خالی) |
| `back/src/payment/deposit-amount.ts` | ✅ **صفر تغییر** |
| `back/package.json` | ✅ **صفر تغییر** (پیچیدگی `moduleNameMapper` اضافه و سپس حذف شد) |

یعنی **هیچ کد مالی یا قیمت‌گذاری بازنویسی نشد.** فقط تست اضافه شد.

### نتیجهٔ دروازهٔ فاز ۳

| بررسی | قبل | بعد |
|---|---|---|
| `tsc --noEmit` back | ۰ | ✅ **۰** |
| `eslint` back | ۰ | ✅ **۰** |
| تست بک‌اند | ۳۲۵ | ✅ **۳۳۰ پاس** (+۵) |
| `tsc --noEmit` front | ۰ | ✅ **۰** |
| `eslint` front | ۰ خطا | ✅ **۰ خطا** |
| تست فرانت | ۴۴ | ✅ **۴۹ پاس** (+۵) |
| `nest build` | ✅ | ✅ |
| `next build` | ۵۱ مسیر | ✅ **۵۱ مسیر (یکسان)** |
| هش فایل‌های حساس | — | ✅ **بدون تغییر** |

**✅ فاز ۳ کامل شد.**

---

## فاز ۵ (بخش الف) — خاموشی تمیز + نقاط بررسی سلامت

**وضعیت:** ✅ کامل شد
**تاریخ:** ۲۰۲۶-۱۱-۰۸
**وابستگی به فاز ۴:** ندارد (عمداً مستقل اجرا شد)

### ۵.۱ `enableShutdownHooks()` — رفع ریسک واقعی در restart

**قبل:** `main.ts` هوک خاموشی نداشت.

نتیجه در production (که با **PM2** اجرا می‌شود):

```
pm2 restart  →  SIGTERM  →  Node خارج نمی‌شود (سوکت Redis باز است)
             →  بعد از مهلت  →  SIGKILL
             →  درخواست‌های در حال پردازش نیمه‌کاره رها می‌شوند
             →  هر restart در لاگ به‌صورت «kill» دیده می‌شود
```

**بعد:**

```ts
app.enableShutdownHooks();   // در main.ts، قبل از setGlobalPrefix
```

و `RedisService` حالا `OnModuleDestroy` را پیاده می‌کند:

| حالت | رفتار |
|---|---|
| اتصال باز است | `client.quit()` — بستن تمیز |
| `quit()` شکست خورد | `client.destroy()` — قطع اجباری تا پروسه معطل نماند |
| اتصال از قبل بسته | هیچ کاری نمی‌کند |
| اتصال ساخته نشده | هیچ کاری نمی‌کند (نبودِ Redis باعث crash در خاموشی نمی‌شود) |

**۴ تست** برای همین رفتار نوشته شد (`redis.service.spec.ts`).

> ✅ تأیید: `grep enableShutdownHooks dist/src/main.js` → خط ۲۱ موجود است.

### ۵.۲ نقاط بررسی سلامت

| مسیر | کاربرد | پاسخ |
|---|---|---|
| `GET /api/health` | liveness | همیشه ۲۰۰، **بدون** لمس DB/Redis |
| `GET /api/health/ready` | readiness | ۲۰۰ اگر سالم، **۵۰۳** اگر نه |

**فایل‌های جدید:** `src/health/{health.module,health.controller,health.service}.ts`

#### تصمیم‌های طراحی

**۱. liveness هرگز به DB/Redis دست نمی‌زند.**
اگر بزند، قطعی دیتابیس باعث می‌شود PM2/Docker پروسهٔ سالم را «مرده» بداند و پشت‌سرهم restart کند — که مشکل را بدتر می‌کند.

**۲. readiness هرگز throw نمی‌کند، ۵۰۳ برمی‌گرداند.**
اگر throw کند، `AllExceptionsFilter` آن را به ۵۰۰ تبدیل می‌کند و load balancer نمی‌تواند «آماده نیست» را از «باگ» تشخیص دهد.

**۳. هر بررسی `timeout` دارد (۱٬۵۰۰ میلی‌ثانیه).**
اگر MySQL سوکت را باز نگه دارد ولی پاسخ ندهد، بدون timeout خودِ healthcheck باعث اشباع کانکشن‌ها می‌شود.

**۴. پیام‌های خطا کوتاه می‌شوند (۲۰۰ کاراکتر).**
هاست/پورت کامل در لاگ می‌ماند، نه در پاسخ HTTP.

**۵. مسیرهای سلامت از محدودیت نرخ مستثنا شدند.**
یک healthcheck هر ۵ ثانیه، سهمیهٔ IP سرور را می‌خورد و — بدتر — در لحظهٔ قطعی واقعی با **۴۲۹** پاسخ می‌گرفت نه ۵۰۳، و مانیتور «سالم» گزارش می‌کرد.

### 🐞 باگ خودم که با تست واقعی پیدا شد

نسخهٔ اول `withTimeout` روی تایمر `unref()` صدا می‌زد:

```ts
timer = setTimeout(...);
timer.unref?.();        // ❌
```

`unref()` باعث می‌شود تایمر پروسه را زنده نگه ندارد. نتیجه: اگر هیچ کار دیگری روی event loop نبود، Node پیش از رسیدن تایمر خارج می‌شد و **`ready()` هرگز resolve نمی‌شد**.

عدد `1500ms` در آزمایش واقعی به‌جای `~1500ms` به «هیچ‌وقت» تبدیل شد. حذف شد و تست رگرسیون نوشته شد:

```ts
it('بررسی معلق را پس از timeout قطع می‌کند و معطل نمی‌ماند', ...)
```

> این یادآوری است که «تست نوشتم» کافی نیست — تست باید رفتار واقعی را بسنجد.

### نتیجهٔ دروازهٔ فاز ۵ (بخش الف)

| بررسی | قبل | بعد |
|---|---|---|
| `tsc --noEmit` | ۰ | ✅ **۰** |
| `eslint` | ۰ | ✅ **۰** |
| تست بک‌اند | ۳۳۴ | ✅ **۳۴۷ پاس** (+۱۳) |
| `nest build` | ✅ | ✅ |
| مسیرهای API موجود | ۵۱ (فرانت) | ✅ **بدون تغییر** |
| `enableShutdownHooks` در build | ❌ | ✅ |
| `/api/health` | ❌ وجود نداشت | ✅ **(۳ تست HTTP)** |

**✅ فاز ۵ (بخش الف) کامل شد.**

### باقی‌ماندهٔ فاز ۵ (نیازمند تصمیم شما)

| مورد | چرا هنوز انجام نشده |
|---|---|
| اعتبارسنجی `env` با Joi/Zod | باید بدانم کدام متغیرها **الزاماً** باید در production باشند؛ حدس زدن ریسک دارد |
| `setup-app.ts` (استخراج از `main.ts`) | سود خوانایی دارد اما ریسک تغییر رفتار boot؛ اولویت پایین |
| `requestId` middleware | مفید برای ردیابی، اما نیاز به تغییر لاگ‌ها دارد |
| `LoggingInterceptor` | حجم لاگ production را زیاد می‌کند؛ باید بدانید ظرفیت دیسک چقدر است |
| یکسان‌سازی `SmsIrService` | دو بار provide می‌شود ولی هر دو مستقل و بی‌خطرند — سود کم |
