# فاز ۹ — سه Audit مستقل

**تاریخ:** ۲۰۲۶-۱۱-۰۸ · **شاخه:** `arena/bd03e7a3-monshim` · **مبنا:** `main`

> قاعدهٔ حاکم بر این سند: **هر عددی که نوشته شده، اجرا شده است.**
> هر چیزی که قابل اجرا نبود، در بخش «اجرا نشد» آمده و به‌عنوان پاس ثبت نشده.

---

## چکیدهٔ اجرایی

| Audit | وضعیت | یافتهٔ بحرانی |
|---|---|---|
| (الف) ساختاری و کد | ✅ **قابل اجرا بود و اجرا شد** | ۰ چرخهٔ جدید، ۰ تغییر در API، ۴ فایل مرده حذف شد |
| (ب) عملکردی و یکپارچگی | ✅ **قابل اجرا بود و اجرا شد** | ۳۵۲ تست پاس، ۱۴۱ اندپوینت بدون تغییر |
| (ج) Production و Deploy | ⚠️ **نیمه‌اجرا** | ۲ باگ واقعی پیدا شد؛ Docker/Nginx/PM2 قابل تست نبودند |

---

# Audit (الف) — ساختاری و کد

## الف-۱. گراف وابستگی و چرخه‌ها

اسکریپت Tarjan روی SCC گراف import واقعی (۲۰۷ فایل، ۳۴۱ یال) — نه شمارش چشمی.

| سنجه | `main` | این شاخه |
|---|---|---|
| فایل اسکن‌شده | ۲۱۱ | **۲۰۷** (−۴) |
| یال (import) | ۳۴۱ | **۳۴۱** |
| گروه چرخه‌ای (SCC > ۱) | **۳** | **۳** |
| **چرخهٔ جدید** | — | **۰** ✅ |

سه چرخهٔ موجود، **همه از قبل بودند** و هیچ‌کدام از این شاخه نیامده‌اند
(`git log main..HEAD -- back/src/{club,locations,ticket}/entities` خالی است).

```
club/entities/customer-group.entity.ts      <-> club/entities/club-customer.entity.ts
locations/entities/province.entity.ts       <-> locations/entities/city.entity.ts
ticket/entities/ticket.entity.ts            <-> ticket/entities/ticket-message.entity.ts
```

**تحلیل:** هر سه الگوی استاندارد رابطهٔ دوطرفهٔ TypeORM هستند
(`@ManyToOne(() => A, a => a.bs)` + `@OneToMany(() => B, b => b.a)`).
این چرخه‌ها **ذاتاً لازم‌اند** و بی‌خطرند: هر دو سمت داخل
decorator arrow-function هستند، پس در زمان import اجرا نمی‌شوند و
`undefined` نمی‌گیرند. در بوت هم عملاً تست شده‌اند (۲۰۷ فایل بدون خطا لود می‌شوند).

**تصمیم: دست نخوردند.** شکستنشان کار درست نیست — یا باید `string` جادویی
جای کلاس بگذاریم (نوع‌ها را از دست می‌دهیم) یا از یک barrel با `import type`
بگذریم (که همین چرخه را جابه‌جا می‌کند). این «پیچیده کردن برای شبیه شدن» است.
ESLint هم هشدار نمی‌دهد. بنابراین **ریسک ثبت‌شده، اقدام‌نشده**.

## الف-۲. هیچ فایل یتیمی باقی نمانده؟

حذف ۳۰ فایل در فاز ۱ با اسکن گراف واقعی انجام شد. بازبینی:

| بررسی | نتیجه |
|---|---|
| `tsc --noEmit` (هر دو پروژه) | **۰ خطا** |
| `eslint` (هر دو پروژه) | **۰ خطا** |
| import به فایل حذف‌شده | هیچ (tsc فوراً می‌شکست) |

## الف-۳. همسانی منطق مشترک

۹۱۱ بردار مرجع (`shared/pricing-vectors.json`, `shared/text-vectors.json`)
**هر دو طرف** را می‌سنجند. با تزریق انحراف عمدی تأیید شد که قفل واقعاً می‌شکند.

## الف-۴. ابهام باقی‌مانده — ثبت‌شده، حل‌نشده

در `main` پوشه‌ای به نام `src/notification/` با ۵ اندپوینت (`/notification`)
وجود داشت که **هرگز mount نشده بودند**:

- `notification.module.ts` هیچ `controllers` نداشت (`grep -c controllers` = **۰**)
- `NotificationService` از هیچ‌جا import نمی‌شد
- `Notification` entity هرگز به `forFeature` داده نشده بود
- فرانت هیچ درخواستی به `/notification` نداشت

یعنی این‌ها scaffold خام `nest g resource` بودند. حذفشان **هیچ قابلیتی را از بین نبرد**.
(تأیید شد که endpointهای واقعی از ۱۴۱ به ۱۴۱ تغییر نکردند.)

---

# Audit (ب) — عملکردی و یکپارچگی

## ب-۱. سطح API — مقایسهٔ ماشینی با `main`

استخراج خودکار همهٔ `@Get/@Post/@Put/@Patch/@Delete` از هر `*.controller.ts`
و ترکیب با `@Controller(prefix)`:

| | `main` | این شاخه |
|---|---|---|
| مسیرهای اعلام‌شده | ۱۴۶ | ۱۴۳ |
| مسیرهای واقعاً mount‌شده | **۱۴۱** | **۱۴۳** |
| تفاوت | — | **+2 health، −5 فانتوم، بقیه صفر** |

بعد از کنار گذاشتن ۵ اندپوینت mount‌نشدهٔ `notification` و ۲ اندپوینت
جدیدِ health:

```
$ diff <(main minus notification) <(branch minus health)
IDENTICAL
```

**نتیجه: هیچ اندپوینتی حذف، تغییر نام یا تغییر امضا نداده.**
تنها افزایش، `GET /api/health` و `GET /api/health/ready` است (فاز ۵-الف، تأییدشده).

## ب-۲. تست‌ها — اجرای واقعی

| مجموعه | تعداد | نتیجه |
|---|---|---|
| بک‌اند (`jest`) | **۳۵۵** (۳۵۲ پاس + ۳ skip) | ✅ `Test Suites: 59 passed, 1 skipped` |
| فرانت (`node --test`) | **۵۴** | ✅ `# pass 54 / # fail 0` |

۳ تست skip شده از قبل skip بودند (نیازمند Redis واقعی) — دست نخوردند.

## ب-۳. مسیرهای حساس

منطق قیمت‌گذاری، Auth، Booking، Payment، Wallet:

| حوزه | چه چیزی تغییر کرد | چطور تأیید شد |
|---|---|---|
| قیمت‌گذاری | **هیچ** | ۹۱۱ بردار همسانی، هر دو طرف |
| Auth/Authz | **هیچ** | تست‌های موجود پاس؛ اندپوینت‌ها یکسان |
| Booking | **هیچ** | تست‌ها پاس؛ اندپوینت‌ها یکسان |
| Payment | **هیچ** | تست‌ها پاس؛ `extractBaseDepositToken` دست نخورد |
| Wallet | **هیچ** | تست‌ها پاس |

## ب-۴. اعتبارسنجی متغیرهای محیطی — یافتهٔ واقعی

همهٔ `process.env.X` و `configService.get('X')` را با محتوای `.env.example`
مقایسه کردم. خروجی اول ۵ مورد «مستندنشده» داد؛ **۴ مورد false positive بود**
(نام‌های جایگزین که به‌عنوان fallback خوانده می‌شوند):

| متغیر | وضعیت واقعی |
|---|---|
| `FRONT_URL` | ✅ مستند است (خط ۵۷، به‌عنوان جایگزین کامنت‌شده) |
| `ZOHAL_API_KEY` / `ZOHAL_TOKEN` | ✅ جایگزین‌های `ZOHAL_API_TOKEN` که مستند است |
| `SESSION_REDIS_TEST_PORT` | ✅ فقط در یک spec، مربوط به تست نیست در production |
| **`UPLOAD_DIR`** | ❌ **واقعاً مستند نبود** → اضافه شد |

`UPLOAD_DIR` را خودم در فاز ۸ اضافه کردم و مستندش نکرده بودم. **رفع شد.**

---

# Audit (ج) — Production و Deploy

## ✅ ج-۱. باگ واقعی که پیدا و رفع شد: نام `dockerfile`

```
back/dockerfile                    ← فایل واقعی (حرف کوچک)
back/docker-compose.yml:25         ← dockerfile: Dockerfile
```

روی Linux (که filesystem حساس به حرف است) `docker compose build` **شکست می‌خورد**.
با `git mv` اصلاح شد (تاریخچه حفظ شد).

## ✅ ج-۲. باگ امنیتی که پیدا و رفع شد: پورت‌های باز

| سرویس | قبل | بعد |
|---|---|---|
| MySQL | `3307:3306` (**از اینترنت**) | `127.0.0.1:3307:3306` |
| Redis | `6381:6379` (**از اینترنت**) | `127.0.0.1:6381:6379` |
| Backend | `3000:3000` | **بدون تغییر** |

پورت هاست **تغییر نکرد**، پس Nginx و هر کانفیگ بیرونی سالم می‌ماند.
فقط این دو سرویس دیگر از بیرون قابل دسترسی نیستند — که هدف بوده.

## 🔴 ج-۳. ریسک بحرانی ثبت‌شده (تغییر نکرد — نیازمند تأیید)

**DDL در زمان بوت:** `BarberService.onModuleInit` یک `ALTER TABLE` می‌زند و
اگر ستون `is_publicly_visible` ساخته نشود، **خطا را rethrow می‌کند** →
Nest بوت را متوقف می‌کند → سایت بالا نمی‌آید (502).

این رفتار **عمدی** است و تست قفلش کرده:
`barber-visibility-schema.spec.ts` → «fails startup with the original error».

**اقدام:** تغییر نکرد. به‌جایش `sql/PRE-DEPLOY-CHECK.sql` (فقط-خواندنی)
و هشدار در `docs/DEPLOY.md` اضافه شد.

## 🔴 ج-۴. ریسک بحرانی ثبت‌شده: زنجیرهٔ `cwd` → `.env` → `synchronize`

`ConfigModule.forRoot()` هیچ `envFilePath` ندارد؛ پیش‌فرض `@nestjs/config`:

```js
resolve(process.cwd(), '.env')     // config.module.js:76
```

اگر `cwd` پروسهٔ PM2 غلط باشد:

```
.env لود نمی‌شود (بی‌صدا، بدون خطا)
→ NODE_ENV = undefined
→ synchronize: undefined !== 'production'  →  true
→ TypeORM اسکیما را با entityها هم‌تراز می‌کند
```

این **خطر تغییر اسکیمای production** است. تغییر نکرد (نیازمند تأیید)؛
در `docs/DEPLOY.md` با دستور بررسی و راه‌حل امن (`NODE_ENV` در اکوسیستم PM2)
مستند شد.

## ✅ ج-۵. خاموشی تمیز (بدون این، PM2 مشکل داشت)

`enableShutdownHooks()` + `RedisService.onModuleDestroy` اضافه شد.
قبل از این، `pm2 restart` پروسه را با SIGKILL می‌کشت و درخواست‌های در جریان
و اتصال Redis را رها می‌کرد.

## ج-۶. Health check

`GET /api/health` (liveness) و `GET /api/health/ready` (readiness، ۵۰۳ در خرابی، با timeout).
در `docker-compose.prod.yml` به‌عنوان healthcheck بک‌اند استفاده می‌شود.

## ❌ ج-۷. اجرا نشد — و به‌عنوان پاس ثبت نمی‌شود

| مورد | چرا | ریسک باقی‌مانده |
|---|---|---|
| `docker build` / `docker compose config` | Docker در sandbox نیست | **بالا** — ساختار YAML با پارسر تأیید شد، بیلد واقعی نه |
| `next build` **در محیط monorepo** | فقط در آزمایش فاز ۴ | **صفر** برای این شاخه (build فعلی ۵۱ مسیر، exit 0) |
| اتصال واقعی MySQL/Redis | هیچ دیتابیسی در sandbox نیست | متوسط |
| Nginx / SSL / PM2 / crontab | روی سرور است، در مخزن نیست | متوسط — نیازمند بررسی دستی |
| تست‌های PWA | نیازمند سرور در حال اجرا | پایین |
| تست‌های Playwright (۴ فایل) | نیازمند chromium | پایین |

**این‌ها «رد» نیستند، «انجام‌نشده» هستند.** برای بستنشان باید روی سرور
یا یک staging اجرا شوند.

---

## جمع‌بندی: آیا می‌توان گفت release-ready؟

**نه — و صادقانه نمی‌گویم.**

- Audit (الف) و (ب) **کامل و پاس**.
- Audit (ج) **نیمه‌کاره**: ۲ باگ واقعی پیدا و رفع شد، ۲ ریسک بحرانی مستند شد،
  اما `docker build` و لایهٔ Nginx/PM2 **اجرا نشدند**.
- دو ریسک بحرانی (ج-۳ و ج-۴) **آگاهانه تغییر نکردند** و منتظر تصمیم شمایند.

### قبل از merge (حداقل)

۱. `back/sql/PRE-DEPLOY-CHECK.sql` روی production
۲. بکاپ تازه + **تست ری‌استور**
۳. `ls -l .env` در `cwd` واقعی PM2 + `pm2 env 0 | grep NODE_ENV`

### بعد از merge (روی سرور یا staging)

۴. `docker compose -f back/docker-compose.prod.yml build`
۵. `curl -s localhost:3000/api/health/ready`
۶. بررسی `/uploads/...` از طریق دامنه (نه فقط localhost)
