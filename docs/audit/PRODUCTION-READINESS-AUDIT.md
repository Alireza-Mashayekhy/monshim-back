# ممیزی جامع پایداری، امنیت و فرآیند انتشار — منشیم

**تاریخ ممیزی:** ۲۰۲۶-۱۱-۰۸
**شاخه:** `arena/bd03e7a3-monshim` (بر پایهٔ `main` @ `167a89f`)
**دامنهٔ بررسی:** کل مخزن (فرانت `front/`، بک‌اند `back/`، Docker، SQL، تست‌ها، Sentry)

> **هشدار مهم دربارهٔ دامنهٔ ممیزی:** تمام یافته‌های این گزارش از **کد مخزن** استخراج شده‌اند. من به سرور Production، فایل `nginx.conf`، اکوسیستم PM2، `.env` واقعی، وضعیت دیسک/RAM، Cron سیستمی و تنظیمات SSL **دسترسی نداشتم** (این فایل‌ها در مخزن نیستند). هر جا نیاز به تأیید سمت سرور است، صریحاً با 🔍 **«نیازمند تأیید روی سرور»** علامت‌گذاری شده و دستور تشخیصی امن هم داده شده است. هیچ چیزی بدون شواهد به‌عنوان باگ قطعی اعلام نشده.

---

## بخش صفر: چه چیزی واقعاً اجرا و تأیید شد؟

برای اینکه گزارش بر پایهٔ حدس نباشد، این موارد را در همین محیط **واقعاً اجرا** کردم:

| بررسی | نتیجه | شواهد |
|---|---|---|
| `pnpm install --frozen-lockfile` (بک‌اند) | ✅ موفق | لاک‌فایل v6 با `specifier`/`version` سازگار است |
| `nest build` (بک‌اند) | ✅ موفق، بدون خطا | خروجی `dist/src/main.js` ساخته شد |
| `pnpm test` (بک‌اند) | ✅ **325 تست پاس**، ۳ skip، ۵۳ سوئیت | `Test Suites: 53 passed` |
| `tsc --noEmit` (بک‌اند) | ⚠️ فقط ۱ خطای تایپ در فایل **spec** | `body-parsers.spec.ts(76,22)` |
| `tsc --noEmit` (فرانت) | ✅ بدون خطا | — |
| `next build` (فرانت) | ✅ موفق | ۴۴ مسیر ساخته شد + `inline-critical-css` روی ۸ صفحه |
| `next lint` / `eslint` (فرانت) | ❌ **۱۹ خطا** (شکست Build در CI) | عمدتاً `simple-import-sort` |
| `pnpm lint` (بک‌اند) | ❌ **۲۳ خطا** (اسکریپت `--fix` دارد) | `require-await`، `no-base-to-string`، unused imports |
| رفتار `redis.connect()` بدون سرور | 🔴 **هیچ‌وقت reject نمی‌شود** — بی‌نهایت retry | اسکریپت تست: ۴۰ ثانیه فقط `ECONNREFUSED` تکرار شد |
| رفتار Node 22 با unhandled rejection | 🔴 پروسه با کد ۱ **می‌میرد** | تست مستقیم |

نتیجهٔ کلی: **کیفیت کد درون‌ها بالا است** (تست واقعی، کامنت‌های دقیق، دفاع‌های امنیتی فکر‌شده) — اما **لایهٔ عملیاتی و فرآیند انتشار تقریباً وجود ندارد**. این همان چیزی است که سایت را در معرض Down شدن قرار می‌دهد، نه باگ‌های منطقی.

---

## بخش اول: وضعیت فعلی پروژه

### ارزیابی کلی

| بُعد | امتیاز | توضیح |
|---|---|---|
| کیفیت و انسجام کد | 🟢 ۸/۱۰ | معماری Nest تمیز، ValidationPipe سراسری، تست واحد واقعی و پرمحتوا، جداسازی مسئولیت خوب |
| پایداری Frontend | 🟡 ۶/۱۰ | Loading/Suspense خوب، لایهٔ نشست بسیار دقیق — اما **هیچ Error Boundary مسیرمحور ندارد** |
| پایداری Backend | 🟡 ۶/۱۰ | فیلتر خطای سراسری خوب، رزرو اتمیک و idempotent — اما **Shutdown Hook، Redis Resilience و Health Check ندارد** |
| پایداری دیتابیس / Migration | 🔴 ۳/۱۰ | **هیچ Migration نسخه‌دار و هیچ Rollback وجود ندارد**؛ تغییر Schema با `ALTER TABLE` در بوت انجام می‌شود |
| زیرساخت و Deploy | 🔴 ۲/۱۰ | **هیچ اسکریپت Deploy، CI/CD، Health Check، مانیتورینگ Uptime و Rollback وجود ندارد** |
| امنیت | 🟡 ۶/۱۰ | Rate limit آگاه از کاربر، کوکی HttpOnly، Secret اجباری — اما **CSRF، Helmet و بستن Endpoint آزمایشی Sentry ندارد** |
| مانیتورینگ | 🟡 ۵/۱۰ | Sentry در هر سه لایه (کلاینت/سرور/بک‌اند) فعال — اما بدون Alert، Uptime و مانیتور منابع |
| قابل بازیابی بودن (Recoverability) | 🔴 ۲/۱۰ | بدون Rollback، بدون backup خودکار، بازگشت نسخه با SQL دستی |
| **آمادگی کلی Production** | 🟠 **۴.۵/۱۰** | «قابل اجرا» بله — «قابل انتشار مطمئن و تکرارپذیر» نه |

### نقاط قوت واقعی (که نباید دست بخورد)

اینها را عمداً ذکر می‌کنم تا در بازنویسی‌ها از بین نروند:

1. `back/src/common/filters/all-exceptions.filter.ts` — خطاهای MySQL/Multer به 400/409/413/503 معنادار تبدیل می‌شوند؛ Stack Trace به کاربر نمی‌رسد.
2. `back/src/common/utils/schema-guard.util.ts` — ساخت idempotent جدول از متادیتای entity (بسیار بهتر از DDL دستی).
3. `back/src/payment/payment.service.ts:1492` `settleVerifiedPayment` — گذار `PENDING → PAID` با `UPDATE ... WHERE status='PENDING'` و بررسی `affected` — **idempotency واقعی و درست**.
4. `back/src/payment/payment.service.ts:717` — قفل `pessimistic_write` روی ردیف آرایشگر داخل تراکنش؛ جلوگیری از رزرو دوگانه.
5. `back/src/notification/reminder.service.ts:104` — «رزرو کردن» یادآوری با UPDATE شرطی (`reminderSentAt IS NULL`) → بدون پیامک تکراری.
6. `back/src/common/utils/throttle-tracker.util.ts` — Rate limit بر اساس کاربر (نه IP مشترک پروکسی). این یک باگ جدی قبلی (لاگ‌اوت شدن کاربران با 429) را حل کرده است.
7. `front/services/api/client.ts` + `session-refresh.ts` + `session-coordination.ts` — منطق نشست بین تب‌ها، جلوگیری از لاگ‌اوت کاذب روی 429/شبکه. بسیار بالغ.
8. `front/lib/public-api.ts` — عدم بلعیدن بی‌صدای خطای SSR (باگ ۴۰۴ کاذب قبلی را حل کرده).

---

## بخش دوم: مشکلات شناسایی‌شده

سطح‌بندی: 🔴 بحرانی | 🟠 بالا | 🟡 متوسط | ⚪ پایین

---

### 🔴 P0-1 — هیچ Migration نسخه‌دار، هیچ Rollback و هیچ کنترل ترتیبی برای Schema وجود ندارد

**مسیر:** `back/sql/*.sql` (۹ فایل)، `back/src/common/config/typeorm.config.ts`، `back/src/barber/barber.service.ts:98-165`

**شواهد فنی:**
- هیچ فایل migration وجود ندارد (`find -name '*migration*'` → خالی). `synchronize` در Production خاموش است (`typeorm.config.ts:17`) و جای آن **۹ اسکریپت SQL دستی** است که باید «به‌ترتیب و یک‌بار» اجرا شوند.
- هیچ‌کدام از این فایل‌ها `IF NOT EXISTS` ندارد (به‌جز `blog.sql`/`public-page.sql` که `CREATE TABLE IF NOT EXISTS` دارند). اجرای دوبارهٔ `ALTER TABLE ... ADD COLUMN` → خطای `ER_DUP_FIELDNAME`. **یعنی Migrationها قابل اجرای مجدد (idempotent) نیستند.**
- **Rollback وجود ندارد.** برای حذف یک ستون هیچ فایل `down` نوشته نشده.
- بدتر: `barber.service.ts:98` در `onModuleInit` مستقیم `ALTER TABLE ... ADD COLUMN` می‌زند و اگر ناموفق شود **عمداً `throw` می‌کند و بوت سرویس شکست می‌خورد** (خط ۱۵۸: `if (!visibilityColumnReady) { ...; throw error; }`). یعنی یک تغییر Schema در زمان بالا آمدن، مستقیماً به «Backend بالا نیامد» تبدیل می‌شود.
- `sql/club-customers-full-name.sql` تغییر **مخرب** است: `ALTER TABLE ... DROP COLUMN firstName, DROP COLUMN lastName` **بدون backup و بدون برگشت**.
- `sql/public-page.sql:41` به جدول `barber_profiles` (جمع) ارجاع می‌دهد، در حالی که entity `BarberProfile` بدون نام صریح تعریف شده و TypeORM با `DefaultNamingStrategy` نام **`barber_profile`** (مفرد) می‌سازد — تأیید شد:
  ```
  BarberProfile -> barber_profile
  User -> user
  Service -> service
  ```
  همچنین `users` (در `public-page.sql:39`) در برابر جدول واقعی `user`. مرحلهٔ `UPDATE` در `public-page.sql:17` روی `JOIN payments` هم بی‌اثر است چون ستون‌ها را نام‌های camelCase نوشته و entityها snake_case هستند (`user_id`, `purpose_id`, `online_paid_at`).

**سناریوی وقوع:**
1. نسخهٔ جدید ستون تازه لازم دارد → اپراتور باید یادش باشد `sql/xyz.sql` را اجرا کند.
2. فراموش می‌کند، یا ترتیب را اشتباه می‌زند، یا دوباره اجرا می‌کند (خطای duplicate column) → بوت بک‌اند در حالت `barber.service` شکست می‌خورد.
3. یا بدتر: ستون ساخته می‌شود اما نسخهٔ قدیمی که آن ستون را نمی‌شناسد هنوز در حال سرویس‌دهی است → ناسازگاری موقت.
4. اگر لازم شد برگردیم به نسخهٔ قبلی، **هیچ راهی برای برگرداندن Schema نیست** و `barber.service` نسخهٔ جدید ممکن است روی Schema قدیمی `throw` کند.

**احتمال وقوع:** زیاد (با هر تغییر مدل داده)
**تأثیر:** 🔴 بالا — بک‌اند بالا نمی‌آید (502/503 کامل) یا داده خراب می‌شود
**سطح:** 🔴 بحرانی

**راهکار پیشنهادی (به ترتیب اولویت):**
1. **کم‌هزینه و فوری (بدون تغییر معماری):** استفاده از Migration داخلی خود TypeORM که **همین حالا در پروژه هست** (typeorm 1.1.1)، با `migrationsRun: false` و اجرای دستی کنترل‌شده. یعنی فقط `DataSource` را در `seed.ts`-مانند بالا بیاورید و `migration:generate` بزنید تا ۲۶ entity موجود به یک migration پایه تبدیل شود. مزیت: Rollback خودکار (`down()`)، ردیابی در جدول `migrations`، بدون ابزار جدید. هزینه: صفر ریالی، پیچیدگی متوسط، ۱–۲ روز کار.
   - ⚠️ **پیش‌نیاز مطلق:** قبل از هر چیز `mysqldump` کامل + تست restore روی دیتابیس staging.
2. هر migration جدید باید در `staging` روی **یک کپی از دیتابیس Production** اجرا و تست شود.
3. `barber.service.ts:98` را از «throw در بوت» به «لاگ + 503 برای همان ماژول» تغییر دهید (مثل الگوی درست `public-page-schema.service.ts:56` که فقط لاگ می‌کند). این یک تغییر کوچک با تأثیر بزرگ است.
4. `sql/club-customers-full-name.sql` را قبل از اجرا به دو مرحلهٔ «افزودن + پر کردن» و «حذف ستون‌های قدیم در نسخهٔ بعدی» تقسیم کنید (Expand/Contract).

**تشخیص امن برای تأیید روی سرور:**
```bash
# فقط خواندن — هیچ تغییری نمی‌دهد
mysql -u root -p -e "SELECT * FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('barber_profile','barber_profiles','user','users','service','services');"
mysql -u root -p -e "SHOW TABLES;" | head -40
```

---

### 🔴 P0-2 — RedisService در بوت بی‌نهایت تلاش می‌کند: اگر Redis بالا نیاید، Backend هرگز Ready نمی‌شود

**مسیر:** `back/src/redis/redis.service.ts:8-23`

**شواهد فنی (تجربی، اجرا شد):** کد فعلی:
```ts
async onModuleInit() {
  this.client = createClient({ socket: { host: ..., port: ... } });
  this.client.on('error', err => { console.log('Redis Error:', err); });
  await this.client.connect();   // ← بدون timeout، بدون catch
}
```
در `redis@5.12.1`، `connect()` وقتی سرور در دسترس نیست **reject نمی‌شود**؛ در حلقهٔ reconnect می‌ماند. تست واقعی من روی پورت بسته:
```
error event: ECONNREFUSED   (×N، به مدت 40 ثانیه)
→ connect() هرگز settle نشد
```
چون این کار در `onModuleInit` و **بدون `try/catch`** انجام می‌شود، `NestFactory.create()` هرگز کامل نمی‌شود و `app.listen()` صدا زده نمی‌شود. هیچ پورتی باز نمی‌شود → Nginx `502` می‌دهد.

**نکتهٔ مهم:** `issueTokens` در `auth.service` قبل از ذخیرهٔ چیزی توکن را برمی‌گرداند، پس **لاگین هم وابسته به Redis است** (`session-revocation` روی `isReady` چک می‌کند و 503 می‌دهد). یعنی **قطع Redis = لاگین و خروج غیرممکن + Backend بالانیامده.**

**سناریوی وقوع:** ری‌استارت سرور، OOM کشتن کانتینر Redis، پر شدن دیسک و از کار افتادن AOF، یا `maxmemory` + سیاست evict.
**احتمال:** متوسط (اما در هر ری‌استارت سرور یک بار ریسک هست)
**تأثیر:** 🔴 کامل — سایت کاملاً Down (نه فقط بخشی)
**سطح:** 🔴 بحرانی

**راهکار:**
1. `await this.client.connect()` را در `try/catch` بگذارید و **بوت را fail نکنید**؛ سرویس باید بالا بیاید و مسیرهای غیرنیازمند Redis کار کنند (سلب مسئولیت: `session-revocation.service.ts` از قبل درست رفتار می‌کند و 503 می‌دهد).
2. `socket.connectTimeout` و `socket.reconnectStrategy` صریح تعریف شود (مثلاً سقف ۲ ثانیه، backoff حداکثر ۳ ثانیه، و `return new Error(...)` بعد از N تلاش).
3. `commandTimeout` تعیین شود تا درخواستی بیش از ۱–۲ ثانیه پشت Redis معلق نماند.
4. `REDIS_PASSWORD` و `maxmemory-policy noeviction` برای Redis (چون کلیدهای `auth:revoked:*` نباید evict شوند — `back/ENVIRONMENT.md` خودش این را هشدار داده).
5. Health check سبک اضافه شود (بخش چهارم) که `redis: PING` را جدا گزارش کند.

**تشخیص امن:**
```bash
redis-cli -h 127.0.0.1 -p 6379 ping
redis-cli -h 127.0.0.1 -p 6379 config get maxmemory maxmemory-policy appendonly
free -m; df -h /
```

---

### 🔴 P0-3 — فرآیند Deploy کاملاً دستی و بدون Rollback است؛ Rollback = بازگرداندن Schema به‌صورت دستی

**مسیر:** غایب — `find -iname '*deploy*' -o -iname '*ecosystem*' -o -iname '*.conf'` → **هیچ نتیجه‌ای**. هیچ `.github/workflows/` وجود ندارد.

**شواهد فنی:**
- هیچ اسکریپت Deploy، هیچ CI/CD، هیچ `ecosystem.config.js` (PM2)، هیچ کانفیگ Nginx در مخزن نیست.
- `back/docker-compose.prod.yml` بک‌اند را با `ports: "3000:3000"` مستقیم روی اینترنت expose می‌کند و `env_file: .env` دارد، اما:
  - **هیچ `healthcheck` برای سرویس `backend` تعریف نشده** (فقط mysql/redis دارند).
  - **هیچ محدودیت منابع (`deploy.resources`/`mem_limit`) ندارد.**
  - **`depends_on` هم ندارد** — اگر Redis بالا نیامده باشد، به P0-2 می‌خوریم.
  - `uploads` به‌صورت bind mount است (`./uploads:/backend/uploads`) → اگر از مسیر دیگری دیپلوی شود، تصاویر کاربران «گم» می‌شوند.
- مراحل Deploy در هیچ مستندی نیست: نصب، Build، Migration، Restart، Verify، Rollback.
- **Rollback نسخهٔ کد هم بدون Rollback دیتابیس بی‌معناست** و Rollback دیتابیس هیچ ابزاری ندارد.

**سناریو:** نسخهٔ جدید Deploy می‌شود → بک‌اند به‌خاطر یک Migration جامانده بالا نمی‌آید → اپراتور نسخهٔ قبلی را `git checkout` می‌کند → نسخهٔ قبلی روی Schema نیمه‌تغییر‌یافته اجرا می‌شود → خطای ۵۰۰ در همه‌جا. زمان بازیابی: نامعلوم (بستگی به مهارت و حافظهٔ اپراتور در لحظهٔ فشار).

**احتمال:** زیاد (به‌ازای هر انتشار، احتمال خطای انسانی)
**تأثیر:** 🔴 بالا — مدت Downtime کنترل‌نشده
**سطح:** 🔴 بحرانی

**راهکار:** بخش پنجم همین گزارش (فرآیند Atomic Deploy با symlink + health check + rollback خودکار). هزینه: صفر ریالی، صرفاً یک اسکریپت bash و ۱ روز کار.

---

### 🟠 P1-1 — قطعی Redis برای **همهٔ** کاربران لاگ‌اوت اجباری نمی‌کند، اما **خروج و ورود را می‌شکند** و مسیر خطا در فرانت «نشست منقضی» تفسیر می‌شود

**مسیر:** `back/src/redis/session-revocation.service.ts:29-35`، `back/src/common/guards/auth.guard.ts:55`، `front/services/api/client.ts:88-110`

**شواهد:**
- بک‌اند درست عمل می‌کند: `if (!client?.isReady) throw new ServiceUnavailableException(...)` → **503 نه 401**. این تصمیم صحیح است.
- اما فرانت در `client.ts` فقط `status === 401` را برای refresh بررسی می‌کند؛ روی 503 چیزی را نمی‌شکند (خوب است). ✅
- **اما مشکل واقعی:** `AuthGuard` روی **همهٔ** مسیرهای محافظت‌شده `isSessionRevoked()` را صدا می‌زند. با قطع Redis، **همهٔ** درخواست‌های پنل 503 می‌شوند — یعنی کل پنل کاربر و آرایشگر و ادمین از کار می‌افتد، هرچند MySQL سالم است. سایت عمومی (`/`, `/provider/[slug]`, `/blog`) چون کش ISR دارد تا ۳۰۰ ثانیه دوام می‌آورد، ولی پنل فوراً می‌افتد.
- این «شکست زنجیره‌ای» است (وابستگی سخت پنل به Redis فقط برای بررسی revocation).

**سناریو:** Redis برای ۲ دقیقه ری‌استارت می‌شود → همهٔ آرایشگرها و ادمین‌ها صفحهٔ خطا می‌بینند.
**احتمال:** متوسط | **تأثیر:** 🟠 بالا (پنل‌ها Down، رزرو عمومی سالم)
**سطح:** 🟠 بالا

**راهکار (درجه‌بندی شده — از کم‌هزینه به پر‌هزینه):**
1. **کم‌هزینه (توصیه‌شده):** Circuit-breaker کوتاه‌مدت (مثلاً ۵ ثانیه cache منفی) روی وضعیت Redis در `SessionRevocationService`، و **fallback به fail-open فقط برای مسیرهای غیرحساس**. منطق: اگر Redis قطع است، یک access token امضاشدهٔ معتبر را بپذیر و در لاگ هشدار بده؛ چون سقف عمر access token ۶ ساعت است و ریسک رها‌شدن نشست ابطال‌شده محدود به همان پنجره است.
   - **مزایا:** پنل در قطعی کوتاه Redis بالا می‌ماند. **معایب:** برای مدت قطعی، نشست‌های logout‌شده تا ۶ ساعت معتبر می‌مانند. یک سوئیچ `REDIS_FAIL_MODE=open|closed` بگذارید تا خودتان تصمیم بگیرید.
2. مطمئن شوید Redis با `appendonly yes --appendfsync everysec` و `maxmemory-policy noeviction` اجرا می‌شود (در `docker-compose.prod.yml` AOF هست ✅ — اما اگر Redis بیرون از Compose است، باید تأیید شود).
3. `restart: unless-stopped` + healthcheck + `depends_on` برای Redis در ترکیب prod.

---

### 🟠 P1-2 — `/api/debug-sentry` و `/api/sentry-example-api` روی Production قابل دسترس‌اند

**مسیر:** `back/src/app.controller.ts:8-11`، `front/app/api/sentry-example-api/route.ts`

**شواهد:**
```ts
@Get('/debug-sentry')          // → /api/debug-sentry
getError() { throw new Error('My first Sentry error!'); }
```
این Endpoint **هیچ گاردی ندارد** و در Production هم ثبت می‌شود. همچنین `front/app/api/sentry-example-api/route.ts` یک route عمومی دارد که **عمداً throw می‌کند**.

**تأثیر:**
1. هر کسی می‌تواند با یک curl، سهمیهٔ Sentry (سقف رایگان/پولی) را پر کند → **تمام خطاهای واقعی کاربران در بازهٔ بحرانی ثبت نمی‌شوند** (کور شدن مانیتورینگ، دقیقاً همان زمان که لازم است).
2. هر درخواست توسط `AllExceptionsFilter` لاگ می‌شود → لاگ پر می‌شود → دیسک (و P1-7).
3. نویز در Alertها (بخش هفتم).

**سناریو:** یک اسکنر یا هر کاربر کنجکاو `GET /api/debug-sentry` → Sentry پر می‌شود.
**احتمال:** بالا | **تأثیر:** 🟡 متوسط تا 🟠 بالا (کوری مانیتورینگ)
**سطح:** 🟠 بالا

**راهکار:** هر دو را حذف کنید یا با `if (process.env.NODE_ENV !== 'production')` ببندید. برای تست Sentry از یک صفحهٔ محافظت‌شده با `Roles(Admin)` استفاده کنید.

---

### 🟠 P1-3 — فرانت هیچ `error.tsx` ندارد؛ یک خطای رندر = صفحهٔ سفید تا `global-error`

**مسیر:** `front/app/` — `find -name 'error.tsx'` → **هیچ نتیجه‌ای** (فقط `global-error.tsx` و یک `not-found.tsx`).

**شواهد فنی:** در App Router، اگر `error.tsx` در سطح segment وجود نداشته باشد، خطای رندر به **بالاترین** سطح حباب می‌کند و `global-error.tsx` اجرا می‌شود. `global-error.tsx`:
```tsx
return (<html><body><NextError statusCode={0} /></body></html>);
```
یعنی **کل UI از بین می‌رود** (بدون هدر، بدون منو، بدون لینک بازگشت) و به‌جای آن یک صفحهٔ خطای جنریک Next نمایش داده می‌شود. با ۴۴ صفحه و ۵ گروه layout، یک خطای جزئی در یک کامپوننت مشترک (مثلاً `DesktopSidebar`) تمام پنل را به صفحهٔ سفید تبدیل می‌کند.

**سناریو:** انتشار نسخه‌ای که یک فیلد جدید API را فرض می‌کند؛ بک‌اند قدیمی آن را نمی‌دهد → `undefined.toLocaleString()` در یک کامپوننت → **کل داشبورد صفحهٔ سفید** برای همهٔ آرایشگرها.
**احتمال:** متوسط-بالا (به‌خصوص در ناسازگاری نسخه — P1-4)
**تأثیر:** 🟠 بالا (تجربهٔ کاربر = سایت خراب؛ اما بقیهٔ سایت سالم است چون layoutهای جدا هستند)
**سطح:** 🟠 بالا

**راهکار:** افزودن `error.tsx` در ۵ گروه مسیر (`(admin)`, `(auth)`, `(dashboard)`, `(panel)`, `(public-barber)`, `(marketing)`) با UI بومی سایت + دکمهٔ «تلاش مجدد» (`reset()`) و «بازگشت به خانه». همچنین `loading.tsx` برای گروه‌های پنل.
- **مزایا:** خطا در یک بخش، بقیهٔ سایت را نمی‌خواباند. **معایب:** هیچ (فقط ۶ فایل کوچک). **هزینه:** چند ساعت.

---

### 🟠 P1-4 — امکان ناسازگاری Frontend/Backend در زمان انتشار وجود دارد و هیچ مکانیزم سازگاری اجباری نیست

**مسیر:** کل قرارداد API — `front/services/features/*/api.ts` ↔ `back/src/*/*.controller.ts`

**شواهد فنی:**
- هر دو طرف **فقط TypeScript type** دارند؛ هیچ schema مشترک (OpenAPI/Zod) در زمان ساخت اعتبارسنجی نمی‌شود. `setupSwagger` در production **عمداً خاموش است** (`main.ts:28`) — خوب است برای امنیت، اما یعنی هیچ قرارداد ماشین‌خوانی برای تست سازگاری وجود ندارد.
- Deploy فرانت و بک‌اند در دو مخزن/پوشهٔ جدا و **بدون هماهنگی اجباری** است: یک نسخهٔ فرانت می‌تواند با نسخهٔ قدیمی یا جدید بک‌اند اجرا شود.
- **هیچ مکانیزم نسخه‌بندی API** (`/api/v1`) و هیچ فیلد/هدر `X-API-Version` وجود ندارد.
- فرانت هیچ‌جا `min-version` بک‌اند را چک نمی‌کند.

**سناریو:** فیلد `depositPrice` نامش تغییر می‌کند → فرانت جدید با بک‌اند قدیمی `NaN` نمایش می‌دهد و طبق P1-3 به صفحهٔ سفید می‌رسد. یا `ResponseInterceptor` (`response.interceptor.ts`) شکل پاسخ را global عوض می‌کند؛ اگر زمانی nested `{data:{data:...}}` بسازید، همهٔ hookها بی‌صدا می‌شکنند.

**احتمال:** متوسط | **تأثیر:** 🟠 بالا | **سطح:** 🟠 بالا

**راهکارها:**
1. **کم‌هزینه:** یک Endpoint سبک `GET /api/version` که `{ version, commit, buildTime }` برگرداند (نیاز به CI برای تزریق commit دارد — بخش ششم).
2. **توصیه اصلی:** قاعدهٔ **«Backend اول، سپس Frontend»** با **سازگاری عقب‌رو (backward compatible) در یک نسخه**: هم فیلد قدیم و هم جدید را مدتی برگردانید، فرانت را منتشر کنید، بعد فیلد قدیم را حذف کنید. این کار نسخه‌بندی سنگین نمی‌خواهد.
3. در CI: یک تست که OpenAPI تولیدشده توسط بک‌اند را بگیرد و با `openapi-typescript` تایپ‌های فرانت را بسازد/مقایسه کند (مزیت: کشف شکست قرارداد قبل از انتشار).

---

### 🟠 P1-5 — `pnpm lint` در هر دو پروژه خطا می‌دهد؛ ESLint قابل استفاده به‌عنوان Quality Gate نیست

**مسیر:** `back/package.json` (`"lint": "eslint ... --fix"`)، `front/package.json` (`"lint": "eslint"`)

**شواهد (اجرا شد):**
- بک‌اند: **۲۳ خطا** — از جمله `require-await` در `payment.service.ts:1293`، `no-base-to-string` در `*:134`، `unused-imports` در `notification.service.ts`.
- فرانت: **۱۹ خطا** — اکثراً `simple-import-sort` در `components/ui/*.tsx`.

**چرا این مهم است (فراتر از «کد نازیباست»):**
1. اگر CI اضافه شود (توصیهٔ من)، **همین خطاها Build را از روز اول قرمز می‌کنند** → تیم مجبور می‌شود Quality Gate را خاموش کند → دیگر هیچ‌وقت قابل اعتماد نیست.
2. **`eslint --fix` در اسکریپت بک‌اند یک تلهٔ واقعی است:** اجرای `pnpm lint` روی سرور یا در CI **بدون تأیید، فایل‌های سورس را تغییر می‌دهد**. من در همین ممیزی آن را اجرا کردم و ۱۱ فایل تغییر کرد (بلافاصله با `git checkout` برگرداندم). این در یک محیط Production با Build ناخواسته می‌تواند تفاوت بین «کد ریپو» و «کد دیپلوی‌شده» بسازد و بررسی Git را بی‌معنا کند.

**سطح:** 🟠 بالا | **احتمال:** قطعی | **تأثیر:** مسدود شدن CI/CD و ریسک تغییر ناخواستهٔ سورس

**راهکار:** (۱) `--fix` را از اسکریپت `lint` جدا کنید (`lint:fix`). (۲) یک‌بار `eslint --fix` را در شاخهٔ مجزا اجرا کنید و با تأیید شما merge کنید تا CI از صفر سبز باشد. (۳) برای فایل‌های `components/ui/*` (shadcn تولیدشده) در ignore قرار دهید.

---

### 🟠 P1-6 — هیچ Health Check واقعی وجود ندارد (نه در Backend، نه در Compose، نه برای Nginx)

**مسیر:** غایب — `grep -rn "health" src/` → هیچ. `back/docker-compose.yml` فقط برای mysql/redis healthcheck دارد.

**شواهد:** تنها Endpointهای پایه `GET /api/debug-sentry` است (که کاربرد Health ندارد). هیچ بررسی DB/Redis/دیسک وجود ندارد.

**تأثیر:**
- PM2/Docker نمی‌فهمند سرویس «بالا آمده ولی آماده نیست» (مثلاً به‌خاطر P0-2 اصلاً listen نمی‌کند).
- Nginx فقط `502` می‌بیند، بدون تشخیص علت.
- مانیتورینگ Uptime نمی‌تواند بین «سایت بالا است» و «سایت بالا است ولی دیتابیس وصل نیست» تفاوت بگذارد — دقیقاً همان چیزی که در P0-1 (schema ناقص) اتفاق می‌افتد و کاربر ۵۰۳ می‌گیرد درحالی‌که Uptime سبز نشان می‌دهد.

**سطح:** 🟠 بالا

**راهکار:** دو Endpoint:
- `GET /api/health` (سبک، بدون DB): همیشه 200 اگر پروسه زنده است → برای Nginx/PM2/liveness.
- `GET /api/health/ready`: بررسی `SELECT 1` روی MySQL + `PING` روی Redis با timeout ۱ ثانیه، خروجی JSON `{ db: 'ok'|'fail', redis: 'ok'|'fail' }` و کد **503** اگر هر کدام خراب است → برای Deploy Gate و readiness.
- این دو را باید از Rate Limiter و لاگ سنگین مستثنی کنید (`@SkipThrottle()`).

---

### 🟠 P1-7 — مدیریت لاگ، Log Rotation و فضای دیسک وجود ندارد

**مسیر:** `back/src/common/filters/all-exceptions.filter.ts`، `back/docker-compose.prod.yml`، `front/next.config.ts`

**شواهد:**
- لاگ‌ها فقط به **stdout** می‌روند (`Logger` نست + `console.log`). هیچ فایل، هیچ چرخش، هیچ ساختار JSON.
- `console.log('Redis Error:', err)` در `redis.service.ts:17` **در حلقهٔ reconnect** (تست من در ۴۰ ثانیه بیست‌ها خط تولید کرد؛ در قطعی طولانی این می‌تواند صدها مگابایت باشد).
- `AllExceptionsFilter` هر خطای DB را `logger.error` می‌کند → در یک قطعی MySQL، هر درخواست یک خط → انفجار لاگ.
- **هیچ محدودیتی برای Docker logs نیست** (`logging: max-size` تعریف نشده) → `docker logs` می‌تواند تا پر شدن دیسک رشد کند. **پر شدن دیسک = MySQL از کار می‌افتد + Redis AOF fail + Build fail.**
- `uploads` در bind mount رشد می‌کند؛ هیچ پاک‌سازی فایل یتیم یا سقف حجم وجود ندارد.

**سناریو:** یک حلقهٔ خطا (مثلاً Redis قطع به مدت ۲ ساعت) → دیسک پر می‌شود → MySQL `No space left on device` → سایت کامل Down و **دیتابیس در معرض خرابی**.
**احتمال:** متوسط | **تأثیر:** 🔴 بحرانی (داده در خطر) | **سطح:** 🟠 بالا (احتمال متوسط، تأثیر بحرانی)

**راهکار:** (۱) `logging: { driver: "json-file", options: { max-size: "20m", max-file: "5" } }` برای همهٔ سرویس‌های Compose. (۲) کاهش سطح لاگ Redis error با throttling. (۳) `logrotate` یا `pm2-logrotate` اگر PM2 استفاده می‌شود. (۴) Alert روی `df -h /` بالای ۸۰٪. (۵) `SET GLOBAL general_log=OFF` تأیید شود (پیش‌فرض خاموش است، اما روی سرور بررسی کنید — این تنها چیزی است که واقعاً دیسک MySQL را می‌خورد).

**تشخیص امن:**
```bash
df -h /; du -sh /var/lib/docker/containers/* 2>/dev/null | sort -h | tail -5
du -sh /var/log/* 2>/dev/null | sort -h | tail -10
```

---

### 🟠 P1-8 — `xlsx@0.18.5` با آسیب‌پذیری Prototype Pollution و ReDoS در باندل فرانت ادمین

**مسیر:** `front/package.json:65` (`"xlsx": "0.18.5"` — پین‌شده دقیقاً روی همین نسخه)، مصرف در `front/services/features/admin-transactions/api.ts:128`

**شواهد:** `xlsx` روی npm **آخرین نسخه‌اش 0.18.5 است** (تأیید شد از رجیستری) و این نسخه دارای CVEهای شناخته‌شده است (Prototype Pollution و ReDoS). چون نسخهٔ اصلاح‌شده فقط از طریق CDN رسمی SheetJS توزیع می‌شود، `npm audit` نمی‌تواند آن را رفع کند.

**تحلیل ریسک واقعی (برای اینکه اغراق نکنم):**
- کتابخانه در **سمت مرورگر** و فقط در پنل **ادمین** استفاده می‌شود → ورودی مهاجم از این مسیر نمی‌آید؛ داده از API خودمان است.
- بنابراین سوءاستفادهٔ مستقیم دشوار است. **اما:** اگر یک کاربر با نقش ادمین (یا حساب ادمینِ نشت‌کرده) داده‌ای را import کند، Prototype Pollution در **مرورگر خود ادمین** اجرا می‌شود و می‌تواند به زنجیرهٔ XSS منجر شود.
- ریسک انبار/SCA: هر ابزار `npm audit` این را **قرمز** نگه می‌دارد و CI را مسدود می‌کند.

**سطح:** 🟠 بالا (از منظر انطباق/CI) تا 🟡 در بهره‌برداری مستقیم | **تأثیر:** متوسط

**راهکار:** (۱) کوتاه‌مدت: `npm audit` را از مسیر بحرانی CI خارج نکنید اما این مورد را با justification مستند در `audit-allowlist` بگذارید. (۲) میان‌مدت: جایگزینی با نسخهٔ رسمی SheetJS (`https://cdn.sheetjs.com/xlsx-0.20.x/...`) یا `exceljs`. (۳) اطمینان از اینکه مسیر «export» (که در `admin-transactions/api.ts` هست) به کاربر غیرادمین بسته است.

---

### 🟠 P1-9 — CSRF: کوکی‌های نشست `SameSite=Lax` هستند و هیچ توکن CSRF یا بررسی Origin وجود ندارد

**مسیر:** `back/src/common/utils/auth-cookie.util.ts:18-25`، `back/src/main.ts:86-92`

**شواهد:**
```ts
sameSite: 'lax', httpOnly: true, secure: production
```
و `CORS_ORIGIN` تعریف شده اما **صریحاً `true` هم می‌شود** اگر env خالی باشد:
```ts
origin: corsOrigin ? corsOrigin.split(',')... : true,   // ← true = بازتاب هر Origin
credentials: true,
```
یعنی اگر `CORS_ORIGIN` تنظیم نشود، **هر دامنه‌ای** با credentials مجاز است. این ترکیب (`origin: true` + `credentials: true`) از نظر امنیتی معادل باز کردن API برای هر Origin است.

**تحلیل:** `SameSite=Lax` جلوی اکثر CSRF با POST cross-site را می‌گیرد (Lax کوکی را روی POST cross-site نمی‌فرستد) — پس **اکثر مسیرها امن‌اند**. اما:
- `SameSite=Lax` کوکی را روی **top-level GET navigation** می‌فرستد. هر GET که side-effect داشته باشد در خطر است. در این کد `GET /api/payment/deposit/:token` ریدایرکت می‌کند (بی‌خطر) ولی این یک الگوی خطرناک است.
- `origin: true` + `credentials` یعنی هر سایتی می‌تواند **پاسخ** درخواست‌های احراز‌شده را بخواند اگر مرورگر کوکی را بفرستد (و در سناریوهای خاص، مثلاً API روی زیردامنه، این ممکن است).

**سطح:** 🟡 متوسط (Lax محافظت اصلی را می‌دهد) | **الزام:** `CORS_ORIGIN` در Production **باید** تنظیم و تأیید شود.

**راهکار:** (۱) تأیید `CORS_ORIGIN=https://monshiim.ir,https://www.monshiim.ir` (بدون آن، `origin: true` فاجعه‌بار است). (۲) بهتر: اگر `CORS_ORIGIN` خالی بود، در Production **بوت را رد کنید** (fail-fast) یا origin را به سایت خود محدود کنید. (۳) هیچ Endpoint GET با side-effect نسازید (قاعدهٔ کدنویسی).

---

### 🟡 P2-1 — هیچ Shutdown Hook فعال نیست؛ Restart/Deploy باعث قطع ناگهانی تراکنش‌ها می‌شود

**مسیر:** `back/src/main.ts` — `grep -c enableShutdownHooks` → **0**

**شواهد:** `NestFactory.create` بدون `app.enableShutdownHooks()`. `RedisService` فقط `OnModuleInit` دارد و `OnModuleDestroy` **ندارد** → اتصال Redis هرگز بسته نمی‌شود.
`BaleBotService` (خط ۵۲) `OnModuleDestroy` دارد ✅ اما چون hookها فعال نیستند، **هرگز صدا زده نمی‌شود**.

**سناریو:** `pm2 restart` / `docker restart` / کرون Deploy → `SIGTERM` → Node فوراً می‌میرد:
- تراکنش‌های باز (مثلاً `settleVerifiedPayment` که در حال ثبت رزرو است) rollback می‌شوند → پرداخت PAID شده اما رزرو ساخته نشده. کرون `reconcileBookingPayments` این را می‌گیرد ✅ (طراحی خوب) **ولی تا ۱۰ دقیقه کاربر نوبت ندارد**.
- درخواست‌های در حال اجرا با 502/504 پاسخ می‌گیرند (اگر Nginx retry نکند).
- `deposit`/`debitBarberAndQueueRefund` نیمه‌کاره رها می‌شوند.

**سطح:** 🟡 متوسط | **احتمال:** قطعی در هر Deploy | **تأثیر:** 🟠 بالا برای همان پنجره

**راهکار:** `app.enableShutdownHooks()` + `OnModuleDestroy` در `RedisService` (`await this.client.quit()`) + `app.close()` با grace period. **مزیت:** هیچ (فقط درست‌تر است). **هزینه:** ۳۰ دقیقه. **عوارض:** هیچ.

---

### 🟡 P2-2 — Cronهای چند-نمونه‌ای بدون قفل توزیع‌شده (در صورت اجرای هم‌زمان دو نسخه)

**مسیر:** `back/src/booking/booking.service.ts:1740,1831,1913`، `back/src/payment/payment.service.ts:1668`، `back/src/notification/reminder.service.ts:28`، `back/src/subscription/user-subscription.service.ts:40`

**شواهد و تحلیل دقیق:** تیم **عمداً** بیشتر مسیرها را idempotent کرده است:
- `autoCompleteOverdueBookings` → `UPDATE ... WHERE status=CONFIRMED` + بررسی `affected` ✅
- `expireUnpaidDepositBookings` → UPDATE شرطی `deposit_paid_at IS NULL` ✅
- `processReminders` → claim با `reminderSentAt IS NULL` ✅
- `expireOverdueSubscriptions` → UPDATE شرطی ✅

**اما در دو نقطه شکاف باقی است:**
1. `expireUnapprovedBookings` (`booking.service.ts:1914`) در مسیر نوبت **بدون پرداخت** (`:1942`) `await this.bookingRepo.update(...)` را می‌زند و `canceledCount += 1` را انجام می‌دهد. دو ایراد: (الف) مقدار برگشتی `update` که `affected` دارد **بررسی نمی‌شود** (برخلاف سایر کرون‌ها) — داده خراب نمی‌شود، اما آمار لاگ در اجرای هم‌زمان دو نمونه اشتباه می‌شود. (ب) در مسیر **پرداخت‌شده**، `cancelByBarberOrAdmin` صدا زده می‌شود؛ اما `cancelByBarberOrAdmin` برای نوبتی که قبلاً `CANCELED` شده `BadRequestException('رزرو لغو شده قابل تغییر نیست')` می‌دهد (`booking.service.ts:628-634`). یعنی **پول دوبار برنمی‌گردد** ✅ (قفل `pessimistic_write` + بررسی وضعیت درون آن متد). اما نمونهٔ دوم یک استثنا می‌گیرد که به `logger.warn` تبدیل می‌شود → در صورت اجرای هم‌زمان دو نسخه، لاگ هشدار کاذب تولید می‌شود. ریسک باقی‌مانده: فقط contention/deadlock و نویز لاگ — **نه از دست رفتن پول**.
2. `reconcileBookingPayments` (خط 1668) `take: 20` روی پرداخت‌های PENDING قدیمی دارد و برای هر کدام به زیبال درخواست می‌زند. اگر دو نمونه اجرا شوند، **دو verify برای یک trackId** → زیبال `result=201` (قبلاً تایید شده) برمی‌گرداند ✅ و `settleVerifiedPayment` روی `affected=0` می‌ایستد ✅. پس idempotent است — اما ترافیک اضافی و ریسک rate-limit درگاه.

**سطح:** 🟡 متوسط (به‌شرط انجام P0-3 به‌صورت Atomic؛ در همان پنجرهٔ ۱۰–۳۰ ثانیه‌ای، ریسک محدود است)
**راهکار کم‌هزینه:** چون روش Deploy توصیه‌شده (بخش چهارم) **Atomic با restart سریع** است و نه rolling، این ریسک تقریباً صفر می‌شود. اگر روزی چند نمونه خواستید، یک قفل Redis ساده (`SET lock:cron:xyz NX EX 600`) اضافه کنید — **نه بیشتر**.

---

### 🟡 P2-3 — تصاویر آپلودی روی دیسک محلی هستند و در Deploy جابه‌جا می‌شوند

**مسیر:** `back/src/files/files.service.ts:23` (`uploadDir = process.cwd()/uploads`)، `back/docker-compose.prod.yml:44`

**شواهد:** `./uploads:/backend/uploads` — یک **bind mount نسبی**. اگر پروژه در مسیر دیگری (مثلاً `releases/2026-11-08/`) چک‌اوت شود، `uploads` **خالی و جدید** ساخته می‌شود → **همهٔ عکس‌های پروفایل و نمونه‌کار «ناپدید» می‌شوند** (فایل‌ها هنوز روی دیسک هستند اما در مسیر قبلی).

**سناریو:** اولین Deploy با روش Atomic/Blue-Green → تمام تصاویر 404 → صفحهٔ عمومی آرایشگرها با تصویر شکسته و اعتماد از دست‌رفته.
**احتمال:** بالا اگر روش Deploy تغییر کند | **تأثیر:** 🟠 بالا | **سطح:** 🟡 متوسط (چون فعلاً دستی و در همان پوشه است)

**راهکار:** مسیر uploads را به **مطلق و خارج از کد** منتقل کنید: `UPLOAD_DIR=/var/lib/monshim/uploads` و در Compose `- ${UPLOAD_DIR}:/backend/uploads`. سپس از همان مسیر در هر نسخه استفاده کنید. همچنین یک اسکریپت بررسی «فایل یتیم» + بکاپ جداگانه برای uploads (بخش پنجم).

---

### 🟡 P2-4 — `trust proxy` به‌صورت پیش‌فرض خاموش است؛ در Production یعنی Rate Limit روی IP مشترک

**مسیر:** `back/src/main.ts:36-48`

**شواهد:** کد خودش دقیقاً هشدار می‌دهد:
```
'TRUST_PROXY در production تنظیم نشده است؛ ... محدودیت نرخ بر اساس IP واقعی هر کاربر اعمال شود.'
```
شمارش کاربران لاگین‌کرده با `user:<id>` حل شده ✅ — اما **همهٔ درخواست‌های بدون توکن** (login، OTP، ثبت‌نام، صفحات عمومی، callback پرداخت) با IP پروکسی شمرده می‌شوند → سقف ۱۲۰/دقیقه بین **کل کاربران مهمان** تقسیم می‌شود.

**سناریو:** کمپین تبلیغاتی → ۵۰ مهمان هم‌زمان روی `/api/public-page/...` → **429** برای کاربران واقعی، دربدترین زمان.
**سطح:** 🟡 متوسط | **تأثیر:** 🟠 بالا در بازهٔ ترافیک بالا

**راهکار:** `TRUST_PROXY=true` در `.env` **باید** تنظیم شود (چون قطعاً پشت Nginx هستید). ⚠️ مهم: این کار فقط وقتی امن است که Backend مستقیماً از اینترنت قابل دسترس نباشد — و این دقیقاً به **P2-5** وصل است.

---

### 🟡 P2-5 — پورت‌های Backend/MySQL/Redis روی هاست منتشر شده‌اند 🔍 نیازمند تأیید

**مسیر:** `back/docker-compose.prod.yml:5,18,26`

**شواهد:** در فایل prod:
- `mysql: ports: "3307:3306"`
- `redis: ports: "6381:6379"`
- `backend: ports: "3000:3000"`

این‌ها پورت را روی **همهٔ اینترفیس‌های هاست** باز می‌کنند، نه فقط `127.0.0.1`. اگر فایروال (ufw/iptables/کلود فایروال) پورت‌های ۳۳۰۷، ۶۳۸۱، ۳۰۰۰ را نبندد، **MySQL با پسورد و Redis بدون احراز هویت از اینترنت قابل دسترس‌اند**. Redis بدون requirepass روی اینترنت = نفوذ فوری و رایج‌ترین بردار باج‌گیری.

**این یک «روند خطر» است، نه اثبات نقض** — چون فایروال ممکن است بسته باشد. باید روی سرور تأیید شود.

**تشخیص امن (فقط خواندن):**
```bash
ss -tlnp | grep -E '3306|3307|6381|3000|3002'
ufw status verbose 2>/dev/null || iptables -S | head -30
# از بیرون (روی سیستم خودتان، نه سرور):
# nc -vz monshiim.ir 3307 ; nc -vz monshiim.ir 6381
```

**راهکار:** در Compose همهٔ پورت‌های داخلی را به loopback bind کنید: `"127.0.0.1:3307:3306"`. و `REDIS_PASSWORD` تنظیم شود. **مزیت:** بزرگ‌ترین ریسک امنیتی زیرساخت بسته می‌شود. **هزینه:** صفر.

---

### 🟡 P2-6 — `ZIBAL_MERCHANT` پیش‌فرض `'zibal'` است (مرچنت تستی) و هیچ هشداری در Production نمی‌دهد

**مسیر:** `back/src/payment/payment.service.ts:118-120`

```ts
private getMerchant(): string {
  return this.configService.get<string>('ZIBAL_MERCHANT') || 'zibal';
}
```
`zibal` مرچنت **آزمایشی/سندباکس** زیبال است. اگر `ZIBAL_MERCHANT` در `.env` ست نشود، پرداخت‌ها در حالت تستی می‌روند. برخلاف `OTP_UNIVERSAL_CODE` و `ZIBAL_MOCK` که هشدارهای صریح Production دارند، این یکی **بی‌صدا** است.

**سناریو:** بازسازی محیط از روی `.env` ناقص → پرداخت‌های تستی → رزرو بدون پول واقعی → **حساب‌های مالی نادرست**.
**سطح:** 🟡 متوسط | **تأثیر:** 🟠 بالا (مالی)

**راهکار:** در `NODE_ENV=production` اگر `ZIBAL_MERCHANT` خالی بود، **هشدار سطح error در بوت** (مثل الگوی موجود در `main.ts`) یا fail-fast. تشخیص: `grep ZIBAL_MERCHANT /path/.env`.

---

### 🟡 P2-7 — Body Parser `json()` سراسری هیچ محدودیت صریحی ندارد (پیش‌فرض 100kb) و هم‌راستا با `BLOG_JSON_LIMIT` است

**مسیر:** `back/src/common/config/body-parsers.config.ts:47-51`

**شواهد:** `app.use(json())` یعنی `limit: '100kb'`. این **امن است** (سقف پایین) ✅. تنها نکته: `urlencoded({ extended: true })` بدون `limit` صریح → پیش‌فرض 100kb هم هست، پس ریسک ندارم. **این مورد را به‌عنوان مشکل ثبت نمی‌کنم**، فقط ذکر می‌کنم که مستند باشد تا کسی روزی `json()` را بی‌محدود نکند.

---

### 🟡 P2-8 — `warnedMessages` در `PaymentService` بدون سقف رشد می‌کند (Memory Leak بسیار کوچک اما واقعی)

**مسیر:** `back/src/payment/payment.service.ts:75,195-200`

**شواهد:**
```ts
private readonly warnedMessages = new Set<string>();
private warnOnce(message: string): void {
  if (this.warnedMessages.has(message)) return;
  this.warnedMessages.add(message);
  this.logger.warn(message);
}
```
و فراخوان با **پیام‌هایی که مقدار متغیر دارند**:
```ts
`${params.key}: ${JSON.stringify(configured ?? null)} قابل استفاده نبود؛ ... (${origin}) ...`
```
چون `origin` از **هدر درخواست** می‌آید (`getRequestOrigin` از `X-Forwarded-Host`/`Host`)، یک مهاجم (یا هر اسکنر) می‌تواند با هدر `Host` متفاوت در هر درخواست، **کلید یکتای جدید** بسازد و `Set` را بی‌نهایت بزرگ کند. این endpointها عمومی‌اند (`POST /api/payment/deposit/:token/pay` بدون گارد).

**اندازهٔ واقعی نشت:** هر رشته ~۲۰۰ بایت. برای رسیدن به ۱۰۰MB به ۵۰۰٬۰۰۰ کلید یکتا نیاز است — یعنی یک حملهٔ عمدی کوچک. **پس این یک Memory Leak واقعی است، اما احتمال طبیعی وقوعش پایین است.**

**سطح:** ⚪ پایین تا 🟡 متوسط | **راهکار:** کلید ثابت به‌جای پیام کامل (`warnOnce(params.key + ':fallback')`) یا `Map` با سقف. **هزینه:** ۵ دقیقه.

---

### ⚪ P3-1 — Discrepancy نام‌گذاری Dockerfile

**مسیر:** `back/dockerfile` (حروف کوچک) در برابر `back/docker-compose.yml:25` (`dockerfile: Dockerfile`).

روی Linux (case-sensitive) ساخت ایمیج با `docker compose build` شکست می‌خورد. اگر Build فعلاً دستی/محلی است مشکلی ایجاد نکرده، اما **هر بار که CI یا سرور جدید راه بیفتد** این خطا ظاهر می‌شود. راهکار: `git mv back/dockerfile back/Dockerfile` (نیازمند تأیید شما).

---

### ⚪ P3-2 — `docker-compose.prod.yml` برای سرویس backend نه `healthcheck` دارد، نه `depends_on`، نه محدودیت منبع، نه logging

**مسیر:** `back/docker-compose.prod.yml`

اگر Redis/MySQL کند بالا بیایند، backend قبل از آماده بودن آن‌ها start می‌شود و به P0-2 می‌خورد. راهکار: `depends_on: { redis: { condition: service_healthy } }` + `healthcheck` روی `/api/health` + `logging` + `deploy.resources.limits`.

---

### ⚪ P3-3 — تست E2E بک‌اند وجود ندارد

**مسیر:** `back/package.json` → `"test:e2e": "jest --config ./test/jest-e2e.json"` اما `back/test/` **وجود ندارد**.

یعنی اسکریپت تست موجود در package.json همیشه شکست می‌خورد (یا فایل کانفیگ گم است). این باعث می‌شود در CI هیچ تست یکپارچگی API اجرا نشود.

### ⚪ P3-4 — ناهماهی lockfile نسخه‌ها

`back/pnpm-lock.yaml` نسخهٔ `6.0` است با `packageManager: pnpm@8.15.4`، ولی فرانت `9.0` است. Dockerfile بک‌اند `pnpm@8.15.4` پین می‌کند ✅ — پس **سازگار است**، اما تفاوت نسخه‌ها بین دو پروژه را مستند کنید و در CI از نسخهٔ درست هر کدام استفاده کنید (نه یک نسخهٔ سراسری).

### ⚪ P3-5 — وابستگی‌های قدیمی

`next 16.2.6` (منتشر ۲۰۲۶-۰۵-۰۷) در حالی که `latest = 16.4.5`. `redis ^5.12.1` در حالی که `6.3.1` موجود است. ارتقای **کورکورانه** توصیه نمی‌شود؛ اما ارتقای patch/minor برای Next (بعد از تست در staging) ارزش امنیتی دارد.

### ⚪ P3-6 — Rate limit فقط سراسری است؛ هیچ سقف اختصاصی برای ورود/OTP نیست

**مسیر:** `back/src/common/config/throttler.config.ts`، `grep "@Throttle"` → فقط `SkipThrottle` در `bale.controller.ts`.

`OTP` سقف خودش را در Redis دارد ✅ (`OTP_HOURLY_LIMIT=5`) اما `POST /auth/login-with-password` (که bcrypt.compare می‌زند) فقط سقف عمومی ۱۲۰/دقیقه دارد. برای brute-force رمز ضعیف است.

**راهکار کم‌هزینه:** `@Throttle({ default: { limit: 10, ttl: 60000 } })` روی `login-with-password` و `/auth/*`.

### ⚪ P3-7 — خطای تایپ موجود در یک فایل تست

`back/src/common/config/body-parsers.spec.ts(76,22)` — `INestApplication` به `NestExpressApplication` نسبت داده می‌شود. `nest build` آن را نادیده می‌گیرد (spec مستثنی است) اما `tsc --noEmit` روی پروژه **شکست می‌خورد** → اگر CI شما `tsc --noEmit` بزند، قرمز می‌شود.

---

## بخش سوم: ریسک‌های پنهان (اکنون مشکل نیستند، اما می‌توانند سایت را بخوابانند)

اینها را از دستهٔ «مشکل فعلی» جدا کردم چون **هیچکدام امروز خطا نمی‌دهند**. با یک تغییر کوچک در آینده به P0 تبدیل می‌شوند.

| # | ریسک پنهان | چرا الان بی‌خطر است | چه چیزی آن را فعال می‌کند |
|---|---|---|---|
| H1 | **`synchronize` واقعاً فقط بر اساس رشتهٔ `NODE_ENV` است** (`typeorm.config.ts:17`). اگر روزی `NODE_ENV` در `.env` جا بیفتد یا به `production ` (با فاصله) یا `prod` تغییر کند، TypeORM **در محیط Production جدول‌ها را بازسازی/تغییر می‌دهد**. | امروز `NODE_ENV=production` در `docker-compose.prod.yml` صریح ست شده ✅ | تغییر یا حذف آن خط، یا اجرای بک‌اند بیرون از Compose با `.env` ناقص → **از دست رفتن/تغییر Schema بدون backup** |
| H2 | **`OTP_UNIVERSAL_CODE` و `ZIBAL_MOCK` به `NODE_ENV` وابسته‌اند** (پیش‌فرض در `dev` روشن). هر محیطی که `NODE_ENV` نداشته باشد → کد `1111` برای همهٔ شماره‌ها فعال می‌شود و پرداخت mock می‌شود. | در Compose prod ست شده | H1 + فراموشی، یا اجرای یک نمونهٔ debug روی همان DB |
| H3 | **تمام Instanceها باید `JWT_ACCESS_SECRET` یکسان داشته باشند** (خودش در `ENVIRONMENT.md` هشدار داده). در Atomic Deploy با `.env` مشترک مشکلی نیست؛ اما اگر روزی محیط جدا ساختید → **لاگ‌اوت تصادفی همه** | فعلاً یک نمونه | ایجاد نمونهٔ دوم (Blue-Green) با env جدا → کاربران به‌طور تصادفی لاگ‌اوت می‌شوند |
| H4 | **upload ها روی دیسک همان سرور** (P2-3). Backup دیتابیس بدون Backup uploads → فاجعهٔ «مالی سالم، برند نابود» | پوشه سرجایش است | هر Deploy که مسیر عوض شود، یا خرابی دیسک |
| H5 | **Cronها در هر نمونه اجرا می‌شوند** و قفل توزیع‌شده ندارند (P2-2) | فقط یک نمونه است | هر روش Deploy که **دو نمونه هم‌زمان** داشته باشد (Rolling/Blue-Green بدون خاموش‌کردن قبلی) |
| H6 | **`ResponseInterceptor` شکل تمام پاسخ‌ها را global عوض می‌کند.** یک تغییر در آن = شکست همهٔ endpointها به‌طور هم‌زمان. | فعلاً درست است | افزودن `data: { data: ... }` یا تغییر `message` → فرانت همه‌جا `undefined` |
| H7 | **`schema-guard` فقط برای ۲ ماژول است** (`public_page_discounts`, `blog_articles`). بقیهٔ ۲۴ entity به SQL دستی متکی‌اند (P0-1) | فایل‌های sql تا امروز اجرا شده‌اند | اولین entity جدیدی که فایل sql برایش نوشته نشود → 503 برای همان ماژول |
| H8 | **`trust proxy` خاموش + مهاجرت به CDN/Cloudflare**: اگر روزی Cloudflare اضافه شود و `TRUST_PROXY=1` بماند، همهٔ IPها یکسان دیده می‌شوند | الان ۱ پروکسی است | افزودن لایهٔ پروکسی دوم → Rate limit همه را با هم می‌بندد (تجربهٔ باگ قبلی) |
| H9 | **هیچ محدودیت اتصال MySQL تعریف نشده** (`extra: { connectionLimit }` ندارد) → پیش‌فرض mysql2 = ۱۰ اتصال. با PM2 در حالت cluster (`instances > 1`) → ۱۰×N اتصال → `ER_CON_COUNT_ERROR` و **میان‌افتادن همهٔ تراکنش‌ها** | فعلاً fork/تک‌نمونه | روشن کردن `exec_mode: cluster` یا `instances: max` در PM2 |
| H10 | **`next/image` optimizer روی همان Node اجرا می‌شود** و `sharp` مصرف CPU بالایی دارد؛ هیچ کش مشترک/CDN و هیچ محدودیتی ندارد. یک صفحه با ۲۰ تصویر ریموت → CPU spike | حجم فعلی کم است | کمپین تبلیغاتی یا اسکنر که URLهای تصویر را با عرض‌های مختلف بخواهد → **CPU ۱۰۰٪ و کندی کل سایت** |
| H11 | **`GET /api/bale/webhook/:secret` با `@SkipThrottle()`**؛ سکرت مشتق از توکن است، اما اگر `BALE_ENABLED=false` باشد response همیشه `{ok:true}` است (بی‌خطر). با فعال بودن، هر درخواست به `handleUpdate` می‌رود | فعلاً احراز هویت دارد ✅ | اگر Secret لو برود → پردازش دلخواه |
| H12 | **تکیهٔ کامل روی یک سرور**: MySQL، Redis، Next و Nest همه روی یک ماشین. یک OOM یا پر شدن دیسک = **فروپاشی کامل** | عادی برای این مقیاس | رشد ترافیک؛ هیچ isolation بین سرویس‌ها نیست |

---

## بخش چهارم: معماری پیشنهادی

### اصل حاکم
**کم‌هزینه، تک‌سروری، بدون Kubernetes.** من هیچ ابزار سنگینی پیشنهاد نمی‌کنم. تمام پیشنهادهای زیر با همان یک VPS و همان Nginx/PM2 یا Docker کار می‌کنند.

### ۴.۱ نقشهٔ معماری هدف

```
                       اینترنت
                          │
                  ┌───────▼────────┐
                  │  Nginx (TLS)   │  proxy_pass → 127.0.0.1:3002 (Next)
                  │  X-Accel، gzip │  proxy_pass → 127.0.0.1:3000 (Nest /api, /uploads)
                  └───┬────────┬───┘
        ┌─────────────▼──┐  ┌──▼──────────────────┐
        │ Next.js  :3002 │  │ NestJS  :3000       │   ← فقط loopback، نه اینترنت
        │ (یک نمونه)     │  │ + /api/health       │
        └────────────────┘  └──┬───────────┬──────┘
                               │           │
                     ┌─────────▼──┐   ┌────▼─────────────┐
                     │ MySQL 8    │   │ Redis 7          │
                     │ 127.0.0.1  │   │ 127.0.0.1        │
                     │ + backup   │   │ appendonly+pass  │
                     └────────────┘   └──────────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ /var/lib/monshim/uploads│  ← مسیر مطلق ثابت، مشترک همهٔ نسخه‌ها
                    └─────────────────────────┘

  مسیر انتشار (Atomic):
  /var/www/monshim/releases/<TIMESTAMP>/   ← نسخه‌های کامل، immutable
  /var/www/monshim/current → releases/<TIMESTAMP>   ← symlink اتمیک
```

### ۴.۲ تصمیم‌های کلیدی و دلیلشان

| تصمیم | چرا |
|---|---|
| **Atomic Deployment با symlink** (نه Blue-Green کامل) | با یک VPS، Blue-Green یعنی دو نسخهٔ کامل + دو پورت + مشکل Cron دوبار اجرا + مشکل دو برابر RAM. Atomic با symlink: **Downtime ~۲–۵ ثانیه**، Rollback در همان زمان، بدون مصرف منابع اضافه. برای سایت رزرو با ترافیک متوسط این انتخاب درست است. |
| **PM2 با `exec_mode: fork` و `instances: 1`** (اگر PM2 استفاده می‌شود) | cluster mode: Cronها چندبار اجرا می‌شوند، `warnedMessages` و کش‌های in-memory ناهمگون می‌شوند، اتصال MySQL چند برابر می‌شود (H9). **تک‌نمونه کافی است** تا وقتی CPU به سقف برسد. |
| **Docker برای MySQL/Redis فقط؛ Next و Nest با PM2 روی هاست** | سرویس‌های stateful در Docker مزیت دارند (نسخه‌پذیری، restart policy). اجرای Next/Nest روی میزبان: Build سریع‌تر، دسترسی مستقیم به فایل‌ها، بدون پیچیدگی شبکه. **اگر ترجیح می‌دهید همه در Docker باشد، همان Atomic با `docker compose up -d` کافی است** — اما باید uploads و .env بیرون از ایمیج باشند. |
| **بدون Sentinel/Cluster برای Redis و MySQL** | یک نمونه کافی است. به‌جایش **صحت داده** (AOF + backup) و **تحمل خطا در کد** (P1-1) را بالا ببرید. |
| **بدون Prometheus/Grafana در فاز اول** | برای یک سرور، Node Exporter + Grafana هزینهٔ حافظه (~۲۰۰MB) و دانش عملیاتی می‌خواهد. با `netdata` (تک‌باینری، ~۵۰MB) یا حتی یک cron با `free/df/curl` + Uptime Kuma، ۹۰٪ ارزش را با ۱۰٪ پیچیدگی می‌گیرید. |

### ۴.۳ کدام Cutover؟

با توجه به **منابع یک سرور** و **وابستگی محکم به دیتابیس مشترک**:

1. **توصیهٔ اصلی: Atomic + short restart** — جواب درست برای این پروژه. Downtime زیر ۵ ثانیه، Rollback فوری، بدون منبع اضافه.
2. **Blue-Green** فقط اگر SLA دقیق «صفر ثانیه» لازم شد و **الزاماتش** را بپذیرید: دو برابر RAM، Cron باید در یک طرف خاموش شود، `JWT_*` مشترک، uploads مشترک، و Migration باید کاملاً backward-compatible باشد. **من این را برای الان توصیه نمی‌کنم.**
3. **Canary** با یک سرور معنا ندارد (نیاز به load balancer وزن‌ده).
4. **Rolling** هم با یک سرور معنا ندارد و برای Cron خطرناک است (P2-2).

---

## بخش پنجم: فرآیند استاندارد Deploy

### ۵.۱ پیش‌نیاز یک‌بار (Setup)

```bash
# ── ساختار پوشه‌ها ────────────────────────────────────────────
sudo mkdir -p /var/www/monshim/{releases,shared}
sudo mkdir -p /var/lib/monshim/uploads
sudo mkdir -p /var/backups/monshim
sudo chown -R deploy:deploy /var/www/monshim /var/lib/monshim

# ── .env مشترک (بیرون از نسخه‌ها تا با Rollback عوض نشود) ────
# /var/www/monshim/shared/.env.backend
# /var/www/monshim/shared/.env.frontend
sudo chmod 600 /var/www/monshim/shared/.env.*

# ── لینک uploads پایدار ──────────────────────────────────────
# در .env بک‌اند:  UPLOAD_DIR=/var/lib/monshim/uploads
```

**متغیرهای حیاتی که باید در `.env` تأیید شوند** (چک‌لیست واقعی بر اساس کد):

```dotenv
NODE_ENV=production
TRUST_PROXY=true                    # ← P2-4 (الزامی پشت Nginx)
CORS_ORIGIN=https://monshiim.ir,https://www.monshiim.ir   # ← P1-9
APP_URL=https://monshiim.ir         # بدون /api
FRONTEND_URL=https://monshiim.ir    # بدون /panel
JWT_ACCESS_SECRET=<32+ bytes random>   # ← در همهٔ نمونه‌ها یکسان (H3)
JWT_REFRESH_SECRET=<32+ bytes random>
ZIBAL_MERCHANT=<مرچنت واقعی>        # ← P2-6، هرگز خالی نگذارید
DATABASE_HOST=127.0.0.1
DATABASE_PASSWORD=<strong>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<strong>             # ← P2-5
REVALIDATE_SECRET=<random>          # باید با فرانت یکی باشد
OTP_UNIVERSAL_CODE=false            # صریح! (H2)
ZIBAL_MOCK=false                    # صریح! (H2)
```

> ⚠️ **`OTP_UNIVERSAL_CODE` و `ZIBAL_MOCK` را صریحاً `false` بنویسید.** با H1/H2، اگر یک روز `NODE_ENV` گم شود، این دو پیش‌فرض **روشن** می‌شوند.

### ۵.۲ اسکریپت انتشار (`deploy.sh` — پیشنهاد، اجرا نشده)

> این فایل را من نساختم چون گفتید «هیچ فایلی را بدون تأیید تغییر نده». اگر تأیید کنید، می‌سازم و تست می‌کنم. ساختار پیشنهادی:

```
۱  set -euo pipefail                     ← هر خطا = توقف فوری
۲  RELEASE=/var/www/monshim/releases/$(date +%Y%m%d-%H%M%S)
۳  git clone/fetch → $RELEASE  (کد جدید، کلون تمیز)
۴  cp shared/.env.* → $RELEASE
۵  BACKEND:  pnpm install --frozen-lockfile && pnpm build
۶  FRONTEND: pnpm install --frozen-lockfile && pnpm build   ← اگر Build شکست خورد: exit، سایت دست‌نخورده
۷  ⛔ PRE-CHECK: backup دیتابیس (mysqldump) + تأیید فضای دیسک > 5GB
۸  ⛔ MIGRATION: اجرا با timeout، اگر خطا داد → ABORT و خبر دادن (هیچ symlinkی عوض نمی‌شود)
۹  pm2 reload/restart بک‌اند  ← خارج از symlink فعلی، مستقیم از $RELEASE
۱۰ HEALTH GATE: تا ۶۰ ثانیه صبر کن /api/health/ready == 200  (db:ok, redis:ok)
    └ اگر FAIL شد → ROLLBACK خودکار (symlink به نسخهٔ قبلی + restart) + ALERT
۱۱ symlink اتمیک:  ln -sfn $RELEASE current   ← این عملیات هسته‌ای اتمیک است (rename)
۱۲ pm2 restart فرانت از current
۱۳ SMOKE TEST: ۴ درخواست واقعی (بخش ۷) → اگر FAIL: ROLLBACK
۱۴ نگه‌داشتن ۳ نسخهٔ آخر، حذف بقیه
```

**نکتهٔ حیاتی در ترتیب:** در این چیدمان، **بک‌اند اول با نسخهٔ جدید بالا می‌آید و فرانت هنوز نسخهٔ قدیمی است** → نیاز به سازگاری عقب‌رو (P1-4). اگر ترتیب را برعکس کنید (فرانت اول)، باید فرانت جدید با بک‌اند قدیمی کار کند. **توصیه: همیشه بک‌اند سازگار با نسخهٔ قبلیِ فرانت باشد** (expand/contract).

### ۵.۳ اگر Build فرانت به‌خاطر RAM متوقف شود

Build فرانت مطمئناً به **حداقل ۲GB RAM آزاد** نیاز دارد (Next 16 + ۴۴ مسیر + Sentry plugin). راه‌حل‌های کم‌هزینه به ترتیب:

1. **Swap اضافه کنید** (ارزان‌ترین):
   ```bash
   sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
   ⚠️ اگر از Docker استفاده می‌کنید، Build داخل کانتینر swap نمی‌بیند — باید بیرون از Docker Build کنید.
2. `NODE_OPTIONS=--max-old-space-size=2048`
3. Build در **زمان کم‌ترافیک** (به‌جای شبانه) — چون Build هم MySQL و Redis را با CPU رقابت می‌دهد.
4. **هرگز** Build را روی همان سرور با `pm2 restart` هم‌زمان نکنید.

🔍 **نیازمند تأیید:** مقدار RAM و Swap فعلی:
```bash
free -m; swapon --show; nproc; cat /sys/fs/cgroup/memory.max 2>/dev/null
```

### ۵.۴ اگر بعد از Deploy «Backend بالا نیامد»

دنبالهٔ تشخیص (به ترتیب):
```bash
pm2 logs <backend> --lines 100 --nostream     # یا: docker logs --tail 100 monshim_backend_prod
# الگوهای شناخته‌شده در همین کدبیس:
#   "ستون نمایش عمومی آرایشگر آماده نیست"   → P0-1: sql/barber-visibility.sql اجرا نشده
#   "Redis Error: ECONNREFUSED"             → P0-2: Redis بالا نیست، بوت معلق است
#   "JWT_ACCESS_SECRET در سرور تنظیم نشده"  → .env ناقص
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
ss -tlnp | grep 3000                          # آیا اصلاً listen می‌کند؟
```
اگر listen نمی‌کند → احتمالاً P0-2 (Redis) است. اگر listen می‌کند ولی 5xx می‌دهد → P0-1 (Schema).

---

## بخش ششم: سیستم جلوگیری از انتشار نسخهٔ معیوب

### ۶.۱ چه چیزی کجا اجرا شود؟

| بررسی | Local (pre-commit) | CI (pre-merge) | Pre-deploy (روی سرور) | Post-deploy |
|---|---|---|---|---|
| ESLint (back + front) | ✅ | ✅ | — | — |
| TypeScript `--noEmit` | ✅ | ✅ | — | — |
| Unit Tests (بک: ۳۲۵ تست) | ✅ (فقط فایل‌های تغییر‌یافته) | ✅ (همه) | — | — |
| Frontend session tests | — | ✅ | — | — |
| E2E Playwright (نشست) | آپشنال | ✅ (nightly، نه هر PR) | — | — |
| **Build بک‌اند** | — | ✅ | ✅ (دوباره، ولی کش‌شده) | — |
| **Build فرانت** | — | ✅ | ✅ | — |
| Migration dry-run روی staging | — | — | ✅ | — |
| `npm audit` (سطح high) | — | ✅ | — | — |
| **Health check `/api/health/ready`** | — | — | قبل از cutover | ✅ تا ۶۰ ثانیه |
| **Smoke Test (۴ درخواست واقعی)** | — | — | — | ✅ و rollback خودکار |
| Backup دیتابیس | — | — | ✅ | — |

### ۶.۲ «اگر تست حیاتی شکست خورد، Deploy متوقف شود»

دروازه‌های سخت (Hard Gates) — هیچ‌کدام قابل دور زدن نباشد:
1. `tsc --noEmit` هر دو پروژه
2. `pnpm test` بک‌اند (صفر failure)
3. `pnpm build` هر دو (کد خروج ۰)
4. Health check بک‌اند (۲۰۰ + `db:ok` + `redis:ok`)
5. Smoke test بعد از cutover

> **پیش‌نیاز فوری این بخش:** وضعیت فعلی ESLint قرمز است (P1-5). قبل از فعال کردن CI، اینها را یک‌بار پاک کنید، وگرنه دروازه از روز اول بی‌اعتبار می‌شود.

### ۶.۳ پیشنهاد CI/CD با کمترین هزینه

**گزینهٔ توصیه‌شده: GitHub Actions** (رایگان برای مخزن خصوصی تا ۲۰۰۰ دقیقه/ماه؛ این پروژه با یک Build ~۲ دقیقه‌ای و تست ~۳۰ ثانیه‌ای، شاید ۳۰۰ دقیقه در ماه مصرف کند → **رایگان**).

- `ci.yml`: روی هر PR → lint + tsc + test + build. **فقط ~۳ دقیقه.**
- `deploy.yml`: روی push به `main` → **SSH به سرور** و اجرای `deploy.sh`. نه Build در GitHub (تا ایمیجها/Docker Hub لازم نباشد).
- Secrets لازم: `SSH_HOST`, `SSH_USER`, `SSH_KEY`. (هرگز در ریپو نباشد.)

**مزایا:** صفر هزینه، Audit Trail، جلوگیری از Deploy نسخهٔ ناقص. **معایب:** وابستگی به GitHub. **جایگزین:** یک pre-push hook محلی + `deploy.sh` که خودش همهٔ تست‌ها را می‌زند (بدون CI) — ۸۰٪ ارزش با ۲۰٪ کار.

---

## بخش هفتم: مانیتورینگ و هشدار

### ۷.۱ آنچه الان دارید (و باید بهتر استفاده شود)

**Sentry در هر سه لایه فعال است** — این یک دارایی واقعی است و **نباید ابزار تکراری نصب کنید**:
- فرانت کلاینت: `front/lib/sentry-client.ts` (با DSN)
- فرانت سرور: `front/sentry.server.config.ts` — ⚠️ `tracesSampleRate: 1` (۱۰۰٪!)
- فرانت edge: `front/sentry.edge.config.ts` — ⚠️ `tracesSampleRate: 1`
- بک‌اند: `back/src/instrument.ts`

**مشکل فوری:** `tracesSampleRate: 1` در سرور یعنی **هر درخواست SSR یک تراکنش Sentry** می‌سازد. با ترافیک واقعی، این یا سهمیهٔ Sentry را تمام می‌کند (و **خطاهای واقعی ثبت نمی‌شوند**) یا هزینهٔ قابل‌توجه می‌سازد. **همچنین کمی CPU.** پیشنهاد: `0.05–0.1` برای سرور، `0` برای edge، و برای کلاینت همان الگوی محیطی موجود (`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`) حفظ شود.

### ۷.۲ آنچه کم است (و کم‌هزینه اضافه می‌شود)

| نیاز | ابزار پیشنهادی | RAM | چرا این |
|---|---|---|---|
| **هشدار Down شدن سایت** | **Uptime Kuma** (Docker، تک‌کانتینر) | ~۱۰۰MB | هشدار Telegram/Bale/SMS، صفحهٔ وضعیت، چک کردن `/api/health/ready` و صفحهٔ اصلی و یک صفحهٔ `/provider/...` |
| **خطاهای Front/Back** | **Sentry** (موجود) | ۰ | فقط Alert Rule تنظیم شود: نرخ خطای > X در ۵ دقیقه → اطلاع |
| **RAM/CPU/Disk** | **Netdata** (تک‌باینری) یا `node_exporter`+Grafana | ~۵۰MB / ~۲۰۰MB | Netdata برای شروع: نصب یک‌خطی، هشدار داخلی برای Disk>80%, RAM>90%, Load |
| **خطاهای MySQL** | لاگ MySQL + Alert روی `Aborted_connects`/`Threads_connected` | ۰ | فقط query دوره‌ای در cron |
| **خطاهای Redis** | `redis-cli info` دوره‌ای | ۰ | `connected_clients`, `used_memory`, `rdb_last_bgsave_status` |
| **Crash شدن سرویس** | PM2 (`pm2 monit` + `pm2 describe`) یا `restart: unless-stopped` | ۰ | هشدار روی `restart_time` که زیاد می‌شود |

**توصیهٔ نهایی و صریح:** فقط **دو چیز** اضافه کنید — **Uptime Kuma** و **Netdata** — و **Sentry موجود را تنظیم کنید**. Prometheus + Grafana را نصب **نکنید**؛ برای یک سرور، پیچیدگی‌اش بیشتر از ارزشش است.

### ۷.۳ معیارهای هشدار پیشنهادی (آستانه‌های عملی)

| هشدار | آستانه | اقدام |
|---|---|---|
| سایت Down | ۲ بررسی متوالی fail (۶۰ ثانیه) | تماس فوری |
| `/api/health/ready` 503 | ۱ بار | تماس فوری |
| نرخ 5xx در Sentry | > ۱۰ در ۵ دقیقه | بررسی |
| RAM | > ۹۰٪ به مدت ۱۰ دقیقه | بررسی Memory Leak |
| Disk | > ۸۰٪ | پاک‌سازی لاگ |
| Response Time P95 | > ۳ ثانیه | بررسی |
| PM2 restart | > ۳ بار در ۱۰ دقیقه | **نشانهٔ Crash Loop** |
| Cron ناموفق | هر بار (لاگ `WARN` در cron) | بررسی |

---

## بخش هشتم: امنیت

| مورد | وضعیت | جزئیات |
|---|---|---|
| **SQL Injection** | 🟢 خوب | تمام جست‌وجوها با QueryBuilder/پارامتر. تنها رشته‌سازی در `notRefundedCondition` است که ورودی کاربر نمی‌گیرد. یک `LIKE '%${id}%'` در `booking.service.ts:594` هست اما `id` یک UUID داخلی است، نه ورودی کاربر → **بی‌خطر** |
| **DTO Validation** | 🟢 خوب | `ValidationPipe` با `whitelist + forbidNonWhitelisted` سراسری → فیلد اضافی رد می‌شود. جلوی mass-assignment را می‌گیرد |
| **نشت Stack Trace** | 🟢 خوب | `AllExceptionsFilter` پیام‌های فارسی امن برمی‌گرداند |
| **افشای اطلاعات در Log** | 🟡 متوسط | `logger.log` پیامک **شماره موبایل** را چاپ می‌کند (`booking-sms.service.ts:241,246`). برای حریم خصوصی مشکل دارد اما بحرانی نیست. `sanitizeLogMessage` در `bale-client.service.ts:192` موجود است ✅ — همان الگو را برای شماره اعمال کنید |
| **JWT** | 🟢 خوب | Secret اجباری و fail-fast؛ access ۶ ساعت + refresh ۳۰ روز شناور؛ revocation در Redis |
| **کوکی** | 🟢 خوب | `httpOnly`, `secure`, `sameSite=lax`, host-only |
| **CSRF** | 🟡 متوسط | P1-9 — `CORS_ORIGIN` باید اجبار شود |
| **Rate Limiting** | 🟡 متوسط | سراسری + آگاه از کاربر ✅؛ سقف اختصاصی برای login ندارد (P3-6) |
| **Helmet / هدرهای امنیتی** | 🟡 | روی فرانت هست ✅ (`next.config.ts`: HSTS, X-Frame-Options...) اما روی **API** هیچ هدر امنیتی نیست. برای API کمتر مهم است (JSON نیست که iframe شود) — با این حال `X-Content-Type-Options: nosniff` روی همهٔ پاسخ‌های API توصیه می‌شود |
| **مدیریت دسترسی** | 🟢 خوب | `RolesGuard` + بررسی `isActive` در `AuthGuard` (کاربر غیرفعال حتی با توکن معتبر رد می‌شود) |
| **Idempotency پرداخت** | 🟢 **عالی** | `settleVerifiedPayment` با `affected` check — بهترین بخش کدبیس |
| **Idempotency رزرو** | 🟢 خوب | قفل pessimistic روی آرایشگر + ثبت `SlotHold` |
| **Endpointهای آزمایشی** | 🔴 | P1-2: `/debug-sentry` باز است |
| **پورت‌های باز** | 🔍 | P2-5 نیازمند تأیید روی سرور |
| **اسرار در ریپو** | 🟢 | `.env` در `.gitignore` ✅. **اما** DSNهای Sentry **hardcode** شده‌اند (`instrument.ts:6`, `sentry.server.config.ts`) — DSN Sentry سکرت نیست (public by design) اما بهتر است از env بیاید تا محیط تست/محصول جدا شود |

---

## بخش نهم: برنامه رفع مشکلات بر اساس اولویت

### اولویت صفر (قبل از هر انتشار بعدی — این هفته)
| # | اقدام | زمان | ریسک انجام نشدن |
|---|---|---|---|
| 0-1 | **بکاپ کامل MySQL + تست restore** روی staging | ۲ ساعت | از دست رفتن دائمی داده‌ها |
| 0-2 | **`try/catch` روی `redis.connect()`** + fail-tolerant boot | ۱ ساعت | یک ری‌استارت Redis = سایت کامل Down |
| 0-3 | **`app.enableShutdownHooks()`** + `OnModuleDestroy` برای Redis | ۳۰ دقیقه | تراکنش‌های نیمه‌کاره در هر Deploy |
| 0-4 | **حذف/بستن `/api/debug-sentry` و `/api/sentry-example-api`** | ۱۵ دقیقه | کوری مانیتورینگ + لاگ پر |
| 0-5 | **تنظیم `TRUST_PROXY`, `CORS_ORIGIN`, `ZIBAL_MERCHANT`, `OTP_UNIVERSAL_CODE=false`, `ZIBAL_MOCK=false`** | ۳۰ دقیقه | 429 جمعی / پرداخت تستی / ورود با کد ثابت |
| 0-6 | **بستن پورت‌های ۳۳۰۷/۶۳۸۱/۳۰۰۰ روی loopback + Redis password** | ۳۰ دقیقه | نفوذ کامل به دیتابیس |
| 0-7 | **`logrotate`/Docker log limit + Alert دیسک** | ۱ ساعت | پر شدن دیسک → خرابی MySQL |
| 0-8 | **روشن کردن Alert در Sentry + نصب Uptime Kuma روی `/api/health`** | ۲ ساعت | اطلاع نیافتن از Down شدن |
| 0-9 | **تنظیم `tracesSampleRate: 0.05` در سرور Sentry** | ۱۰ دقیقه | اتمام سهمیه + کوری خطاهای واقعی |

### اولویت یک (۱–۲ هفته)
- 1-1: `error.tsx` برای ۵ گروه مسیر + `loading.tsx` برای پنل‌ها (P1-3)
- 1-2: Endpointهای `/api/health` و `/api/health/ready` (P1-6)
- 1-3: **پاک‌سازی خطاهای ESLint** و جداسازی `lint:fix` (P1-5)
- 1-4: اسکریپت `deploy.sh` با Health Gate + Rollback (P0-3)
- 1-5: انتقال `UPLOAD_DIR` به مسیر مطلق `/var/lib/monshim/uploads` (P2-3)
- 1-6: `depends_on`/`healthcheck`/`logging`/`limits` در `docker-compose.prod.yml` (P3-2)
- 1-7: Fail-fast برای `ZIBAL_MERCHANT` خالی در Production (P2-6)
- 1-8: اسقاط `xlsx` یا مستندسازی + allowlist (P1-8)

### اولویت دو (۳–۶ هفته)
- 2-1: **انتقال به Migration نسخه‌دار TypeORM** + حذف `ALTER TABLE` از `onModuleInit` (P0-1)
- 2-2: CI با GitHub Actions (lint/tsc/test/build) (بخش ۶)
- 2-3: `GET /api/version` + قاعدهٔ سازگاری عقب‌رو در API (P1-4)
- 2-4: Fail-open/fail-closed قابل‌تنظیم برای Redis در AuthGuard (P1-1)
- 2-5: `@Throttle` روی `login-with-password` (P3-6)
- 2-6: حذف شماره موبایل از لاگ‌ها (بخش امنیت)
- 2-7: Netdata + هشدارهای منابع
- 2-8: تست `test:e2e` بک‌اند یا حذف اسکریپت شکسته (P3-3)

### اولویت سه (بهبود تدریجی)
- 3-1: `schema-guard` را به بقیهٔ entityها تعمیم دهید (H7)
- 3-2: ارتقای Next به آخرین 16.x و Redis به 6.x (با تست)
- 3-3: هدرهای امنیتی API (`nosniff`)
- 3-4: `warnOnce` با کلید ثابت (P2-8)
- 3-5: `git mv back/dockerfile back/Dockerfile` (P3-1)
- 3-6: CDN برای `/uploads` و `next/image` (H10)

---

## بخش دهم: چک‌لیست اجرایی

### ✅ قبل از Deploy

```
□ بکاپ دیتابیس گرفته شد و **تست restore** شد            ← مهم‌ترین آیتم
□ بکاپ uploads گرفته شد
□ فضای دیسک > 5GB آزاد است                          (df -h /)
□ RAM آزاد + Swap کافی برای Build هست               (free -m)
□ .env تأیید شد: NODE_ENV=production, TRUST_PROXY=true,
  CORS_ORIGIN, ZIBAL_MERCHANT, OTP_UNIVERSAL_CODE=false,
  ZIBAL_MOCK=false, JWT_* یکسان
□ Migrationهای جدید روی **کپی دیتابیس Production در staging** اجرا و تأیید شدند
□ Migration دارای مسیر rollback است (یا backward-compatible است)
□ تغییر API **عقب‌رو سازگار** است (فرانت قدیمی با بک‌اند جدید کار می‌کند)
□ CI سبز است: lint + tsc + tests + build
□ نسخهٔ سالم قبلی مشخص و قابل دسترس است (برای rollback)
□ اطلاع‌رسانی به تیم/پشتیبانی در زمان Deploy
```

### ✅ بعد از Deploy (حداکثر ۵ دقیقه اول)

```
□ /api/health        → 200
□ /api/health/ready  → 200 با db:ok, redis:ok
□ PM2: هیچ restart جدیدی نیست                    (pm2 list)
□ لاگ بک‌اند: هیچ ERROR جدیدی نیست                (pm2 logs --lines 50)
□ صفحهٔ اصلی سایت باز می‌شود (200, بدون خطای کنسول)
□ /provider/<یک اسلاگ واقعی> باز می‌شود
□ ورود با OTP یک حساب تستی موفق است
□ پنل داشبورد باز می‌شود (بدون صفحهٔ سفید)
□ یک رزرو تستی ساخته می‌شود (یا مسیر رزرو تا صفحهٔ درگاه)
□ سهمیه Sentry/خطاها: نرخ خطای جدیدی ثبت نشد
□ RAM/CPU در محدودهٔ عادی است                     (free -m, top)
□ /uploads/<فایل واقعی> با 200 و تصویر درست برمی‌گردد
```

### 🔙 اگر هر آیتم بالا شکست خورد — Rollback

```
۱ symlink را به نسخهٔ قبلی برگردان:  ln -sfn <RELEASE_PREV> current
۲ pm2 restart backend frontend
۳ Health check را دوباره بزن
۴ اگر Schema تغییر کرده بود: از بکاپی که در مرحلهٔ قبل گرفتید restore کنید
   ⛔ NEVER: rollback کد بدون بررسی اینکه آیا نسخهٔ قدیمی با Schema جدید کار می‌کند
۵ خطا را در Sentry با tag نسخه ثبت کنید
۶ Post-mortem: چرا Gateها نگرفتند؟
```

---

## بخش یازدهم: محدودیت‌های این ممیزی (شفاف)

مواردی که **نتوانستم** بررسی کنم و برای پاسخ قطعی باید تأیید شوند:

1. **پیکربندی Nginx** — هیچ فایلی در مخزن نیست. باید تأیید شود: `proxy_read_timeout`/`send_timeout` (پیش‌فرض ۶۰ ثانیه — برای عملیات طولانی مثل کرون و پرداخت کافی است)، `client_max_body_size` (باید ≥ 50MB برای ویدیو بلاگ + margin)، و configuration `/uploads`.
2. **PM2** — وجود ندارد در مخزن. اگر استفاده نمی‌شود، `restart: unless-stopped` Docker نقش Process Manager را دارد ✅.
3. **فضای دیسک، RAM، Swap، تعداد CPU** — نمی‌دانم. دستور در ۵.۳ داده شد.
4. **Backup موجود** — هیچ اسکریپت backup در مخزن نیست. اگر cron سیستمی وجود دارد، باید تأیید شود.
5. **فایروال** — نیازمند `ufw status`.
6. **SSL** — نیازمند بررسی expiry و renewal خودکار (`certbot renew --dry-run`).
7. **نسخهٔ MySQL واقعی** — Compose می‌گوید `mysql:8.0`، اما اگر سرور Docker نیست، باید تأیید شود.
8. **مسیر واقعی Deploy و `.env`** — کلیدهای واقعی را ندیدم (و نباید ببینم).

---

## جمع‌بندی در یک پاراگراف

منشیم از نظر **کیفیت کد و منطق دامنه** یک پروژهٔ بالغ و غیرمعمول است: ۳۲۵ تست واقعی، idempotency پرداخت درست، رزرو اتمیک، منطق نشست دقیق، و مستندسازی درون‌کدی که بسیاری از تیم‌ها ندارند. اما این پروژه **هیچ لایهٔ عملیاتی ندارد**: نه Migration و Rollback، نه Health Check، نه اسکریپت Deploy، نه مانیتور Uptime، نه Alert، نه Log Rotation. نتیجه این است که **سایت با کد سالم می‌تواند Down شود** — چیزی که در P0-1 و P0-2 دقیقاً دیدیم. سه اقدام اول (بکاپ و تست restore، tolerant کردن بوت نسبت به Redis، و بستهٔ `deploy.sh` با Health Gate و Rollback) ۸۰٪ خطر «Downtime در حین انتشار» را با کمتر از یک هفته کار از بین می‌برد و نیاز به هیچ ابزار گران یا معماری پیچیده‌ای ندارد.

> **نکتهٔ اجرایی:** طبق درخواست شما هیچ فایلی از پروژه تغییر نکرد. تنها استثنا این بود که اسکریپت `pnpm lint` (که `--fix` دارد) هنگام بررسی، ۱۱ فایل سورس را خودکار اصلاح کرد؛ بلافاصله با `git checkout -- back/src` به وضعیت قبل برگردانده شد و `git status` اکنون کاملاً پاک است. این خودش شاهد زندهٔ مشکل P1-5 است.
