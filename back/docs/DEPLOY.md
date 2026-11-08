# راهنمای deploy و rollback

> این سند فقط چیزهایی را می‌گوید که **از مخزن قابل اثبات است**.
> هر جا نیاز به تأیید روی سرور است، صریح علامت خورده.
> فایل‌های `nginx.conf`، اکوسیستم PM2 و `.env` واقعی **در مخزن نیستند** —
> بنابراین هیچ ادعایی درباره‌شان نمی‌کنم.

---

## ۰. هشدار پیش از هر deploy

### 🔴 سرویس در بوت DDL می‌زند — این را قبل از deploy بدانید

`BarberService.onModuleInit` هنگام بالا آمدن سرویس، وجود ستون
`is_publicly_visible` را بررسی می‌کند و اگر نبود، `ALTER TABLE` می‌زند.

اگر دیتابیس اجازهٔ `ALTER` ندهد یا این ستون ساخته نشود:

```
کاربر دیتابیس شما ALTER permission denied
→ onModuleInit خطا می‌دهد و throw می‌کند
→ Nest بوت را متوقف می‌کند
→ سرویس بالا نمی‌آید
→ Nginx خطای 502 برمی‌گرداند
```

این **رفتار عمدی** است و تست هم دارد
(`barber-visibility-schema.spec.ts` → «fails startup with the original error»).
دلیلش این است که ادامهٔ کار بدون این ستون، صفحه‌های عمومی آرایشگران را
خراب نشان می‌دهد.

**پس قبل از هر deploy این را اجرا کنید:**

```bash
mysql -u root -p <db> < back/sql/PRE-DEPLOY-CHECK.sql
```

اگر هر ردیف `MISSING` بود، **اول** فایل `sql/` مربوطه را اجرا کنید،
**بعد** سرویس را restart کنید.

---

## ۱. بکاپ (قبل از هر تغییر ساختاری)

شما گفته‌اید هر چند روز یک‌بار بکاپ می‌گیرید. برای deploy بکاپ **تازه** لازم است:

```bash
# ۱. گرفتن بکاپ
mysqldump --single-transaction --routines --triggers \
  -u root -p <db> > /var/backups/monshim-$(date +%F-%H%M).sql

# ۲. بررسی اینکه فایل سالم و غیرخالی است
ls -lh /var/backups/monshim-*.sql | tail -1
tail -3 /var/backups/monshim-*.sql | tail -3     # باید "Dump completed" داشته باشد

# ۳. تست واقعی restore — روی یک دیتابیس جداگانه، نه روی production
mysql -u root -p -e "CREATE DATABASE monshim_restore_test"
mysql -u root -p monshim_restore_test < /var/backups/monshim-<file>.sql
mysql -u root -p -e "SELECT COUNT(*) FROM monshim_restore_test.booking"
mysql -u root -p -e "DROP DATABASE monshim_restore_test"
```

> ❗️ بکاپی که restore آن تست نشده، بکاپ نیست.
> این تنها چیزی است که تفاوت بین «چند دقیقه قطعی» و «از دست رفتن داده» را می‌سازد.

---

## ۲. مسیر deploy پیشنهادی (سرویس در دسترس)

```bash
# ۰. بررسی پیش‌نیاز دیتابیس (بخش ۰)
mysql -u root -p <db> < back/sql/PRE-DEPLOY-CHECK.sql

# ۱. بکاپ + تست restore (بخش ۱)

# ۲. آوردن کد جدید در یک پوشهٔ release جدا
cd /var/www/monshim-releases
git fetch origin && git checkout <tag-or-sha>

# ۳. نصب و build — بدون دست زدن به سرویس در حال اجرا
cd back  && pnpm install --frozen-lockfile && pnpm build
cd ../front && pnpm install --frozen-lockfile && npm run build

# ۴. بررسی سلامت build قبل از restart
test -f back/dist/src/main.js && echo "backend build OK"

# ۵. restart با مهلت کافی (enableShutdownHooks فعال است)
pm2 restart monshim-backend
pm2 restart monshim-frontend

# ۶. تأیید
curl -sf http://127.0.0.1:3000/api/health      && echo "backend alive"
curl -sf http://127.0.0.1:3000/api/health/ready && echo "backend ready"
curl -sfI http://127.0.0.1:3002/              && echo "frontend alive"
```

> 🔍 **نیازمند تأیید روی سرور:** نام دقیق پروسه‌های PM2 (`pm2 list`)،
> پورت فرانت (پیش‌فرض کد `3002`)، و مسیر `/var/www/...`.
> این‌ها را از مخزن نمی‌توانم بدانم.

### اگر `/api/health/ready` ۵۰۳ داد

پاسخ JSON می‌گوید کدام وابستگی خراب است:

```json
{ "status": "degraded", "checks": { "database": "down", "redis": "ok" },
  "details": { "database": "connect ECONNREFUSED 127.0.0.1:3306" } }
```

---

## ۳. Rollback

```bash
# سریع‌ترین: برگشت به release قبلی و restart
cd /var/www/monshim-releases
git checkout <previous-sha>
cd back && pnpm install --frozen-lockfile && pnpm build
cd ../front && npm run build
pm2 restart monshim-backend && pm2 restart monshim-frontend
```

**محدودیت مهم:** rollback کد **داده را برنمی‌گرداند**.
اگر deploy شامل `ALTER TABLE` بوده، برگشت کد با اسکیمای جدید هم‌زیستی می‌کند
(معمولاً بی‌خطر، چون فقط ستون اضافه شده). اما اگر ستونی **حذف یا تغییر نام** داده شود،
rollback کد می‌شکند. به همین دلیل:

> **قانون:** هر تغییر اسکیما باید فقط «افزودنی» باشد (`ADD COLUMN` با `DEFAULT`).
> هیچ‌وقت `DROP` یا `RENAME` در همان deployی که کد را عوض می‌کند انجام نشود.

---

## ۴. آنچه در این مخزن **نیست** و باید روی سرور بررسی شود

| مورد | چرا مهم است |
|---|---|
| `nginx.conf` | پروکسی `/api` و `/uploads` و TLS |
| `ecosystem.config.js` (PM2) | `cwd` — اگر اشتباه باشد، `.env` و `uploads` پیدا نمی‌شوند |
| `.env` واقعی | مقادیر production |
| وضعیت SSL | انقضا و تمدید خودکار |
| `crontab` | زمان‌بندی بکاپ |

### بررسی امن `cwd` در PM2 (چون روی `.env` و `uploads` اثر دارد)

```bash
pm2 jlist | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    print(p['name'], '-> cwd =', p['pm2_env'].get('pm2_cwd') or p['pm2_env'].get('cwd'))
"
```

مسیر خروجی باید همان پوشه‌ای باشد که `.env` و `uploads/` در آن هستند.
اگر نیست، با `UPLOAD_DIR` در `.env` مسیر آپلود را صریح کنید (این متغیر حالا پشتیبانی می‌شود).
