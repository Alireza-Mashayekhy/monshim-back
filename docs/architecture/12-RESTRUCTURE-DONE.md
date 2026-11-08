# بازآرایی انجام‌شده — گزارش کامل

**تاریخ:** ۲۰۲۶-۱۱-۰۸ · **شاخه:** `arena/bd03e7a3-monshim`
**نقطهٔ بازگشت:** `git tag pre-monorepo` · **۶ کامیت جدید**

---

## ۱. ساختار نهایی

```
.husky/pre-commit              ✅ گارد commit (تست‌شده)
.prettierrc                    ✅ مشترک در ریشه
lint-staged.config.mjs         ✅
package.json                   ✅ اسکریپت‌های workspace
pnpm-workspace.yaml            ✅
turbo.json                     ✅
apps/
  api/                         @monshim/api   (NestJS)
    src/common/
      config/ constants/ database/ decorators/ enum/
      exceptions/ guards/ interceptors/ services/ utils/ validation/
  web/                         @monshim/web   (Next.js)
    app/ components/ hooks/ lib/ services/ store/ providers/ ...
docs/
infra/                         Dockerfile, .dockerignore, compose ×3
packages/
  contracts/                   بردارهای مرجع مشترک
  eslint-config/               قواعد مشترک ESLint
  tsconfig/                    پیکربندی مشترک TS
scripts/                       مولدهای بردار + هوک resolver
```

---

## ۲. 🎯 صفر تغییر وابستگی — بزرگ‌ترین ریسک خنثی شد

در فاز ۴، دلیل رد monorepo این بود که ادغام دو لاک‌فایل **۵۳ نسخه** را عوض می‌کرد.

**راه‌حل:** قبل از ادغام، هر ۱۱۵ وابستگی (۵۸ + ۵۷) به نسخه‌ای که **همین حالا نصب بود** پین شد.

|                      | نتیجه      |
| -------------------- | ---------- |
| پین‌شده              | ۱۱۵ (۱۰۰٪) |
| نسخه‌های تغییر‌یافته | **۰**      |

```
api: 58 pinned, 0 mismatches
web: 57 pinned, 0 mismatches
```

یعنی نه `mysql2`، نه `typeorm`، نه `express` — **هیچ‌کدام** عوض نشدند.

---

## ۳. چهار باگ واقعی که اجرا پیدا کرد

این‌ها را **اجرا** پیدا کرد، نه بازبینی چشمی. هر چهار مورد در حالت
«بدون تست» بی‌صدا شکسته می‌شدند.

### باگ ۱ — مسیر `shared/` در تست هم‌سانی

```ts
// قبل
const VECTORS_PATH = path.resolve(__dirname, '..', '..', '..', 'shared', ...);
```

برای `back/src/payment/` درست بود. بعد از انتقال به `apps/api/src/payment/` به
`apps/shared/` اشاره می‌کرد.

```
FAIL src/payment/pricing-parity.spec.ts
ENOENT: /apps/shared/pricing-vectors.json
```

**۲ suites شکست خوردند.** رفع: `findRepoRoot()` که بالا می‌رود تا
`pnpm-workspace.yaml` یا `.git` را ببیند. دیگر به عمق پوشه وابسته نیست.

### باگ ۲ — `next build` در monorepo

```
Error: We couldn't find the Next.js package (next/package.json)
       from the project directory: /apps/web/app
```

دقیقاً همان چیزی که فاز ۴ پیش‌بینی کرده بود. رفع:
`turbopack.root = path.resolve(process.cwd(), '..', '..')` → **۴۵ صفحه، موفق**.

### باگ ۳ — 🔴 خروجی build به پوشهٔ اشتباه

این خطرناک‌ترین بود. پس از انتقال `outDir` به `packages/tsconfig`:

```
$ pnpm build          →  exit 0  ✅ (به نظر سالم)
$ ls apps/api/dist/src/main.js
ls: cannot access ...   ❌
$ find . -name main.js
packages/tsconfig/dist/src/main.js     ← خروجی این‌جا رفته بود
```

**نتیجه روی production:** `start:prod` که `node dist/src/main` اجرا می‌کند
**پیدا نمی‌کرد** و سرویس بالا نمی‌آمد — بدون هیچ خطای build.

**علت:** گزینه‌های مسیر‌دار در `tsconfig` مشترک، نسبت به **فایلی که آن‌ها را
تعریف می‌کند** حل می‌شوند، نه فایلی که از آن ارث می‌برد.

**رفع:** `outDir`, `baseUrl`, `incremental`, `tsBuildInfoFile` در config
**مصرف‌کننده** می‌مانند؛ بستهٔ مشترک فقط گزینه‌های معنایی دارد.

### باگ ۴ — `lint-staged` و ESLint

```
From ESLint v9.0.0, the default configuration file is now eslint.config.js
```

`lint-staged` دستور را از **ریشهٔ مخزن** اجرا می‌کند و ESLint پیکربندی را از
`cwd` پیدا می‌کند، نه از محل فایل. رفع: `cd` به پوشهٔ اپ قبل از `eslint`.

**و یک ناسازگاری:** `prettier/prettier` در قواعد مشترک گذاشته بودم، ولی فقط
بک‌اند پلاگین prettier را دارد:

```
The "prettier" plugin is not defined in your configuration file
```

از قواعد مشترک حذف و فقط در بک‌اند اعمال شد.

---

## ۴. مواردی که آگاهانه انجام **نشدند**

شما ساختاری خواستید که چند بخش آن در کد فعلی معادلی ندارد. ساختن پوشهٔ
خالی «تکمیل کار» نیست — بدهی است.

| خواسته                                        | چرا ساخته نشد                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `common/bootstrap/`                           | `main.ts` همین است؛ انتقالش rename است نه اصلاح                                                                        |
| `common/messages/`                            | `constants/` مقادیر کانفیگ دارد (سقف SMS)، نه متن کاربر. پوشه خالی می‌ماند                                             |
| `common/middleware/`                          | تنها middleware داخل `main.ts` است و به `getUploadRoot()` وابسته است؛ استخراجش ترتیب راه‌اندازی را عوض می‌کند بدون سود |
| `apps/web/features/[name]/`                   | **۱۳۰+ کامپوننت در هم تنیده**. این بزرگ‌ترین کار باقی‌مانده است و باید جدا و با تأیید انجام شود                        |
| `common/database/` ریشهٔ `apps/api/database/` | `typeorm.config.ts` + seeds به `common/database/` رفتند (کار می‌کند). جدا کردن کامل نیاز به تصمیم دارد                 |

**`packages/contracts`** با بردارهای موجود ساخته شد، ولی **نوع مشترک** اضافه
**نشد** — چون نوع مشترک نوشتن بین بک/فرانت «توسعهٔ قابلیت» است، نه بازآرایی،
و ریسک تغییر رفتار دارد.

---

## ۵. Gate نهایی (اندازه‌گیری‌شده)

| بررسی              | نتیجه                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| `turbo typecheck`  | ✅ **2/2**                                                                |
| `turbo lint`       | ✅ **2/2**، ۰ خطا (۲۰ warning از قبل: `<img>`)                            |
| `turbo test`       | ✅ api **۳۵۲ پاس** + ۳ skip / web **۵۴ پاس**                              |
| `turbo build`      | ✅ **2/2**                                                                |
| `dist/src/main.js` | ✅ موجود                                                                  |
| `.next/BUILD_ID`   | ✅ موجود                                                                  |
| بوت واقعی اپ       | ✅ تا `TypeOrmModule initialized` (بعد: بدون MySQL متوقف — انتظار می‌رود) |
| مولدها             | ✅ خروجی byte-identical                                                   |
| pre-commit hook    | ✅ ۳ سناریو تست شد                                                        |

---

## ۶. ⚠️ کارهایی که قبل از deploy روی سرور لازم است

### 🔴 ۱. `UPLOADS_HOST_PATH` را **مطلق** کنید

`./uploads` نسبت به محل فایل compose است. حالا compose در `infra/` است:

```bash
# در .env سرور:
UPLOADS_HOST_PATH=/var/lib/monshim/uploads
UPLOAD_DIR=/var/lib/monshim/uploads
```

**بدون این، تصاویر قبلی پیدا نمی‌شوند** (فایل‌ها پاک نمی‌شوند، فقط مسیر عوض می‌شود).

از سرور فعلی بگیرید:

```bash
docker inspect $(docker ps -q --filter name=backend) \
  --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

### 🔴 ۲. مسیر PM2 عوض شده

```
قبل: <project>/back
بعد: <project>/apps/api
```

و `ConfigModule` هیچ `envFilePath` ندارد → `.env` از `cwd` خوانده می‌شود.
اگر `cwd` PM2 به‌روز نشود:

```
.env لود نمی‌شود → NODE_ENV=undefined → synchronize=true
→ خطر تغییر اسکیمای production
```

```bash
pm2 delete monshim-backend
cd <project>/apps/api && pm2 start "pnpm start:prod" --name monshim-backend \
  --cwd <project>/apps/api
# یا اکوسیستم را به‌روز کنید و:
pm2 restart monshim-backend
pm2 env 0 | grep NODE_ENV     # باید production باشد
```

### ۳. دستورهای جدید build

```bash
pnpm install --frozen-lockfile        # از ریشهٔ مخزن
pnpm --filter @monshim/api build
pnpm --filter @monshim/web build
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
```

### ۴. `docker build` واقعی هنوز اجرا نشده

Docker در این محیط نیست. مراحل Dockerfile را **دستی و دقیقاً** شبیه‌سازی کردم
(بدون `apps/web`، مثل context واقعی): نصب ✅، build ✅، `dist/src/main.js` ✅.
ولی `docker build` واقعی **تأیید نشده**.

---

## ۷. برگشت در صورت مشکل

```bash
git reset --hard pre-monorepo
pnpm install
```

یا revert تک‌تک:

```bash
git revert 80f424f   # eslint-config
git revert 402a397   # docs
git revert a964082   # husky
git revert dbe1cb4   # common split
git revert f0674b0   # infra/packages
git revert c2a056d   # monorepo (بزرگ‌ترین)
```

---

## ۸. باقی‌مانده

| مورد                         | وضعیت                                         |
| ---------------------------- | --------------------------------------------- |
| `apps/web/features/[name]/`  | ❌ انجام نشد — ۱۳۰+ کامپوننت، نیاز به فاز جدا |
| نوع‌های مشترک در `contracts` | ❌ انجام نشد — توسعهٔ قابلیت است              |
| `docker build` واقعی         | ❌ تأیید نشده (Docker نیست)                   |
| MySQL/Redis واقعی            | ❌ تأیید نشده                                 |
| CI روی GitHub                | ⛔ مسدود (مجوز `workflows`)                   |
| `UPLOADS_HOST_PATH` مطلق     | ⏳ نیازمند مقدار سرور از شما                  |
