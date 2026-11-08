# فاز ۴ (Monorepo) — پاسخ به «مشکلی روی اجرا ایجاد نمی‌شود؟»

**روش پاسخ: کپی کامل گرفتم، monorepo را واقعاً ساختم و اجرا کردم. حدس نمی‌زنم.**

---

## ۱. آیا کد اجرا می‌شود؟ ✅ بله — همه چیز پاس شد

در کپی موقت `/tmp/mono` با `pnpm-workspace.yaml`:

| بررسی | نتیجه |
|---|---|
| `pnpm install` | ✅ ۴۲ ثانیه (first run) |
| `tsc --noEmit` بک‌اند | ✅ **۰ خطا** |
| `nest build` | ✅ `dist/src/main.js` ساخته شد |
| `require("src/…")` در dist | ✅ **۰** (همان‌طور که پیش‌بینی شد) |
| تست بک‌اند | ✅ **۳۴۷/۳۴۷** |
| `tsc --noEmit` فرانت | ✅ ۰ |
| تست فرانت | ✅ **۵۴/۵۴** |
| `next build` | ✅ **۵۱ مسیر** |
| `eslint` هر دو | ✅ ۰ خطا |
| boot واقعی بک‌اند | ✅ تا اتصال MySQL می‌رسد (همان رفتار فعلی) |

### ❗️ اما یک مشکل واقعی پیدا شد که با حدس پیدا نمی‌شد

`next build` **شکست خورد**:

```
Error: Next.js inferred your workspace root, but it may not be correct.
We couldn't find the Next.js package (next/package.json)
from the project directory: /tmp/mono/front/app
```

**علت:** Turbopack اجازهٔ خواندن بیرون از `root` را نمی‌دهد. در monorepo، `next` واقعاً در `root/node_modules/.pnpm/...` است (حتی با `node-linker=hoisted`). `turbopack.root: process.cwd()` این را مسدود می‌کند.

**راه‌حل (آزمایش شد و کار کرد):**

```ts
// front/next.config.ts
turbopack: {
  root: path.resolve(process.cwd(), '..'),   // ریشهٔ monorepo
}
```

بعد از این تغییر: **۵۱ مسیر، موفق.**

> 🔴 نکتهٔ مهم: `node-linker=hoisted` **کمک نکرد** و اصلاً لازم نبود. با linker پیش‌فرض (isolated) همه چیز کار می‌کند. اگر کسی «رفع مشکل» را با hoisted امتحان کند، وقت تلف می‌کند.

---

## ۲. اما ۵۲ نسخهٔ وابستگی عوض می‌شود

این جدی‌ترین بخش است. لاک‌فایل واحد، همه چیز را از نو resolve می‌کند:

| پروژه | وابستگی مستقیم | نسخه عوض می‌شود |
|---|---|---|
| back | ۵۸ | **۲۳** |
| front | ۵۷ | **۲۹** |
| **جمع** | ۱۱۵ | **۵۲** |

نمونه‌های حساس:

```
mysql2             3.24.4 → 3.24.6      ← درایور دیتابیس
typeorm            1.1.1  → 1.1.2       ← ORM
express            5.2.1  → 5.3.0       ← وب‌سرور
@nestjs/core       11.2.3 → 11.2.8
@nestjs/throttler  6.5.0  → 6.7.1       ← محدودیت نرخ
@sentry/nestjs     11.0.0 → 11.11.0
lucide-react       1.52.0 → 1.70.0      ← آیکون‌ها (UI)
radix-ui           1.7.0  → 1.8.1
@tiptap/*          3.32.2 → 3.33.0      ← ویرایشگر بلاگ (۱۵ پکیج)
```

**همه SemVer-compatible هستند** (هیچ major نیست) و **همه ۴۰۱ تست با آن‌ها پاس شدند**. اما:

- این‌ها نسخه‌هایی هستند که **الان روی سرور اجرا می‌شوند** و تغییر می‌کنند
- `mysql2` و `typeorm` و `express` هستهٔ سرویس‌اند
- شما گفتید «به پروژه آسیب نزن» — این تغییر در سطح وابستگی است، هرچند تست‌ها سبزند

---

## ۳. 🚨 مانع سخت در Deploy که باید بدانید

`back/dockerfile` این خط را دارد:

```dockerfile
RUN npm install -g pnpm@8.15.4
...
RUN pnpm install --frozen-lockfile
```

اما یک workspace lockfile **باید v9** باشد. آزمایش کردم:

```
ERR_PNPM_LOCKFILE_BREAKING_CHANGE
Lockfile /tmp/mono/pnpm-lock.yaml not compatible with current pnpm
```

**یعنی: اگر monorepo را انجام دهیم، `docker build` بک‌اند قطعاً شکست می‌خورد** تا وقتی:
1. `dockerfile` به `pnpm@9` تغییر کند، **و**
2. `COPY package.json pnpm-lock.yaml ./` به ریشه تغییر کند و `back/` به‌عنوان زیرپوشه کپی شود.

هر دو در فاز ۸ (Docker) هستند — که گفتید «انجام بده».

همچنین `rsync`/PM2 روی سرور: با monorepo باید **کل مخزن** منتقل شود نه فقط `back/`، چون لاک‌فایل در ریشه است.

---

## ۴. ⚠️ یک تلهٔ پنهان: `.env` و `process.cwd()`

`ConfigModule.forRoot()` **مسیر `.env` را صریح نمی‌دهد** → به `process.cwd()` وابسته است.

بررسی شد که کد به `cwd` وابسته است:

| مقدار | وابسته به cwd |
|---|---|
| `uploads/` (فایل‌ها + سرو استاتیک) | ✅ `process.cwd()/uploads` |
| `.env` (ConfigModule پیش‌فرض) | ✅ `.env` در cwd |
| `sql/blog.sql` (فقط در تست) | ✅ |

**اگر PM2 با `cwd` متفاوت اجرا شود، `.env` و `uploads` پیدا نمی‌شوند** — و تصاویر آپلودی «گم» می‌شوند.

**در monorepo این ریسک بیشتر می‌شود** چون ساختار پوشه‌ها تغییر می‌کند و احتمال اشتباه در `cwd` بالاتر می‌رود.

**راه‌حل پیشنهادی (مستقل از monorepo):** `envFilePath` و `UPLOAD_DIR` صریح شوند:

```ts
ConfigModule.forRoot({ envFilePath: join(__dirname, '../../.env') })
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
```

این کار **بدون monorepo هم** ریسک را کم می‌کند.

---

## ۵. verdict من

### «آیا مشکل اجرا ایجاد می‌شود؟» — نه در کد، بله در Deploy

| سطح | وضعیت |
|---|---|
| کد و تست‌ها | ✅ **همه پاس** (۴۰۱ تست، ۵۱ مسیر) |
| Build بک‌اند | ✅ |
| Build فرانت | ⚠️ **نیازمند یک خط در `next.config.ts`** (آزمایش شد) |
| Docker | 🔴 **می‌شکند** تا فاز ۸ انجام نشود |
| نسخه‌های اجرایی | ⚠️ **۵۲ تغییر** |
| `.env`/`uploads` | ⚠️ ریسک `cwd` (قابل رفع) |

### توصیهٔ صریح من

> **monorepo را الان انجام ندهید.**
>
> دلیل: تنها سود واقعی‌اش «یک لاک‌فایل» و «پکیج مشترک» است. اما هزینه‌اش این است که ۵۲ نسخهٔ وابستگی — از جمله `mysql2`، `typeorm` و `express` — روی همان سروری که با PM2 اجرا می‌شود عوض شوند، **و** Docker باید هم‌زمان اصلاح شود، **و** `cwd` سرور باید دوباره تأیید شود.
>
> در مقابل، **همان هدف اصلی (منطق پول یکتا) در فاز ۳ با ریسک صفر به دست آمد.**

### اگر باز هم می‌خواهید، ترتیب امن این است:

```
۱. فاز ۸ (Docker) اول: pnpm@9 + COPY از ریشه        ← مانع را بردار
۲. قفل ۱۱۵ نسخه (حذف ^)                              ← نسخه‌ها تکان نمی‌خورند
۳. فقط بعد از آن: افزودن pnpm-workspace.yaml
۴. turbopack.root در next.config.ts
۵. تأیید cwd و .env روی سرور
```

این ترتیب، «مشکل اجرا» را عملاً صفر می‌کند — چون هر تغییر قبل از تغییر بعدی تأیید می‌شود.
