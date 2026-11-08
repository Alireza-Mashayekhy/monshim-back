# چک‌لیست Deploy — Monshim (بعد از بازآرایی به monorepo)

> این سند اختصاصی **همین تغییر ساختاری** است.
> برای جزئیات بیشتر: `apps/api/docs/DEPLOY.md`
>
> **قاعده:** هر جا نوشته «احتمالاً» یا «تأیید کن»، یعنی من از مخزن نمی‌توانم
> بدانم و **نباید حدس بزنم**. آن‌ها را روی سرور خودت چک کن.

---

## ۰. خلاصهٔ وضعیت — قبل از هر کاری بخوان

| موضوع                    | وضعیت                                    |
| ------------------------ | ---------------------------------------- |
| کد و تست‌ها              | ✅ آماده (۳۵۲ + ۵۴ تست پاس)              |
| ساختار جدید              | ✅ کار می‌کند                            |
| **مسیر فایل‌های آپلودی** | 🔴 **باید روی سرور ست شود**              |
| **`cwd` پروسهٔ PM2**     | 🔴 **باید عوض شود**                      |
| متغیرهای محیطی           | ⚠️ فقط ۲ متغیر جدید/تغییریافته           |
| اسکیمای دیتابیس          | ✅ **هیچ تغییری نکرد**                   |
| `docker build` واقعی     | ❌ **تست نشده** (Docker در محیط من نبود) |

---

## ۱. کارهایی که باید **قبل** از deploy انجام دهی

### ✅ ۱-۱. بکاپ تازه + تست ری‌استور (تو گفتی می‌گیری — این بار باید تازه باشد)

```bash
# بکاپ دیتابیس
mysqldump --single-transaction --routines --triggers \
  -u root -p <db_name> > /var/backups/monshim-$(date +%F-%H%M).sql

# بکاپ فایل‌های آپلودی (مسیر فعلی را اول پیدا کن)
docker inspect $(docker ps -q --filter name=backend) \
  --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
# بعد با همان Source:
tar -czf /var/backups/monshim-uploads-$(date +%F).tar.gz <uploads_source_path>
```

**تست واقعی ری‌استور — بکاپ تست‌نشده بکاپ نیست:**

```bash
mysql -u root -p -e "CREATE DATABASE monshim_restore_test"
mysql -u root -p monshim_restore_test < /var/backups/monshim-<file>.sql
mysql -u root -p -e "SELECT COUNT(*) FROM monshim_restore_test.booking"
mysql -u root -p -e "DROP DATABASE monshim_restore_test"
```

### ✅ ۱-۲. بررسی اسکیما با فایل فقط-خواندنی

```bash
mysql -u root -p <db_name> < apps/api/sql/PRE-DEPLOY-CHECK.sql
```

۱۲ بررسی، بدون هیچ DDL/DML. اگر ردیفی `MISSING` بود، **اول** فایل `sql/`
مربوطه را اجرا کن، بعد deploy.

> ⚠️ **مهم:** سرویس هنگام بوت `ALTER TABLE` می‌زند و اگر ستون
> `is_publicly_visible` ساخته نشود، **کل سایت بالا نمی‌آید** (502).
> این رفتار عمدی است و تست قفلش کرده. پس این مرحله را رد نکن.

### ✅ ۱-۳. پیدا کردن مقادیر واقعی سرور (بدون این‌ها deploy نکن)

```bash
# ۱) مسیر و cwd پروسه‌های PM2
pm2 jlist | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    e = p['pm2_env']
    print(p['name'], '| cwd =', e.get('pm2_cwd'), '| script =', e.get('pm_exec_path'))
"

# ۲) کجا پروژه روی سرور است
pm2 jlist | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['pm2_env']['pm_cwd'])"

# ۳) مسیر uploads در حال استفاده
docker inspect \$(docker ps -q --filter name=backend) \
  --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# ۴) پورت فرانت
ss -ltnp | grep -E ':(3000|3002)\b'
```

**این چهار خروجی را نگه دار — در مراحل بعد لازم می‌شوند.**

---

## ۲. متغیرهای محیطی (env)

### ۲-۱. 🔴 دو متغیری که **باید** عوض شوند

```bash
# در .env بک‌اند:

# ۱) مسیر آپلود — حالا با مسیر مطلق، مستقل از ساختار پروژه
UPLOAD_DIR=/var/lib/monshim/uploads

# ۲) مسیر میزبان برای volume داکر (اگر از Docker استفاده می‌کنی)
UPLOADS_HOST_PATH=/var/lib/monshim/uploads
```

**چرا؟** قبلاً `./uploads` بود، یعنی نسبت به محل فایل `docker-compose` و
`cwd`. حالا که ساختار عوض شده (`back/` → `apps/api/`، compose به `infra/`)،
مسیر نسبی به جای اشتباه اشاره می‌کند و **تصاویر قبلی پیدا نمی‌شوند**.

با مسیر مطلق:

- فایل‌ها از `rm -rf` پروژه، `git checkout` و بازسازی ایمیج جان سالم به در می‌برند
- بکاپ‌گیری یک مسیر ثابت دارد

> فایل‌ها **پاک نمی‌شوند** — فقط اگر `UPLOAD_DIR` غلط باشد، سرویس جای
> دیگری نگاه می‌کند و تصاویر قدیمی نمایش داده نمی‌شوند.

### ۲-۱-۲. 🔴 فایل `.env` **کجا** باید باشد؟

این را با دقت بخوان — بعد از بازآرایی، محل `.env` عوض شده:

```
✅ درست:  <project>/apps/api/.env
❌ غلط :  <project>/.env
❌ غلط :  <project>/apps/.env
```

**چرا؟** `ConfigModule.forRoot()` هیچ `envFilePath` ندارد و `@nestjs/config`
این کار را می‌کند (تأییدشده در `config.module.js:76`):

```js
resolve(process.cwd(), '.env');
```

یعنی `.env` از **`cwd` پروسه** خوانده می‌شود، نه از کنار کد. اگر `cwd` را
`apps/api` بگذاری (که در بند ۳-۳ توصیه شده)، فایل باید همان‌جا باشد.

**نتیجهٔ اشتباه بودن این مسیر — بدون هیچ خطا:**

```
.env پیدا نمی‌شود → NODE_ENV = undefined
→ synchronize: undefined !== 'production'  →  true
→ TypeORM اسکیما را هم‌تراز می‌کند  →  🔴 خطر روی production
```

**راه تأیید (بعد از restart):**

```bash
pm2 jlist | python3 -c "
import json,sys
p=[x for x in json.load(sys.stdin) if x['name']=='monshim-backend'][0]
cwd=p['pm2_env'].get('pm2_cwd')
print('cwd =', cwd)
import os
print('.env exists there:', os.path.exists(os.path.join(cwd,'.env')))
"
```

> ✅ راه امن دوم: `NODE_ENV: 'production'` را صریح در اکوسیستم PM2 بگذار
> (در بند ۳-۳ نشان داده شده). اینطور حتی اگر `.env` لود نشود،
> `synchronize` روشن نمی‌شود.

### ۲-۲. ✅ متغیرهای الزامی بک‌اند (اگر از قبل ست هستند، دست نزن)

| متغیر                | نکته                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | **باید** `production` باشد. اگر نباشد `synchronize` روشن می‌شود و **اسکیما را تغییر می‌دهد** |
| `DATABASE_HOST`      | نام سرویس در compose یا `127.0.0.1`                                                          |
| `DATABASE_PORT`      | `3306` (داخل compose) یا `3307` (از روی هاست)                                                |
| `DATABASE_USERNAME`  |                                                                                              |
| `DATABASE_PASSWORD`  |                                                                                              |
| `DATABASE_NAME`      |                                                                                              |
| `REDIS_HOST`         | بدون Redis، ورود/خروج کار نمی‌کند                                                            |
| `REDIS_PORT`         | `6379`                                                                                       |
| `JWT_ACCESS_SECRET`  | حداقل ۳۲ کاراکتر، **متفاوت** از refresh                                                      |
| `JWT_REFRESH_SECRET` |                                                                                              |
| `PORT`               | `3000` — **عوض نکن** (Nginx روی همین تنظیم است)                                              |

### ۲-۳. 🔴 متغیرهایی که در production باید **خالی** باشند

| متغیر                | چرا                                                   |
| -------------------- | ----------------------------------------------------- |
| `OTP_UNIVERSAL_CODE` | اگر مقدار داشته باشد، **هر کسی** با آن کد وارد می‌شود |
| `ZIBAL_MOCK`         | اگر `true` باشد، **پول واقعی جابه‌جا نمی‌شود**        |
| `ZOHAL_MOCK`         | همان                                                  |

### ۲-۴. متغیرهای اختیاری (اگر قبلاً ست نکردی، الان وقت خوبی است)

| متغیر                              | اثر                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `FRONTEND_URL`                     | برای وبهوک/ریدایرکت                                                     |
| `CORS_ORIGIN`                      | اگر فرانت روی دامنهٔ جداست                                              |
| `TRUST_PROXY`                      | پشت Nginx تنظیم کن، وگرنه rate-limit روی IP اشتباه اعمال می‌شود         |
| `REVALIDATE_SECRET`                | **همین مقدار باید در env فرانت هم باشد**، وگرنه پاک‌سازی کش کار نمی‌کند |
| `SMS_IR_API_KEY`                   | بدونش پیامک نمی‌رود                                                     |
| `ZIBAL_MERCHANT`                   | بدونش پرداخت کار نمی‌کند                                                |
| `BALE_BOT_TOKEN` + `BALE_CHAT_IDS` | اعلان‌های پشتیبانی                                                      |

### ۲-۵. ✅ متغیرهای فرانت (مهم!)

```bash
# در env پروسهٔ فرانت (PM2) — نه بک‌اند
NEXT_PUBLIC_API_URL=/api              # ⚠️ هنگام BUILD خوانده می‌شود، نه runtime
API_URL=http://127.0.0.1:3000/api     # آدرس داخلی برای SSR
API_PROXY_TARGET=                     # اگر Nginx خودش پروکسی می‌کند، خالی
NEXT_PUBLIC_IMAGE_URL=                # مسیر نسبی؛ تصاویر از /uploads
REVALIDATE_SECRET=<همان مقدار بک‌اند>
```

> ⚠️ **`NEXT_PUBLIC_*` هنگام build داخل باندل قرار می‌گیرد.**
> اگر آن را عوض کردی، **باید دوباره build کنی**، نه فقط restart.

---

## ۳. مرحلهٔ Deploy (PM2 — روش فعلی سرور تو)

### ۳-۱. آماده‌سازی

```bash
cd <مسیر پروژه>
git fetch origin
git checkout <sha یا tag>
```

**اگر مطمئن نیستی، اول این را ببین که چه چیزی عوض می‌شود:**

```bash
git diff --stat <sha قبلی> HEAD | tail -5
```

### ۳-۲. نصب و build — **از ریشهٔ مخزن** (نه از `apps/api`)

```bash
# نصب
pnpm install --frozen-lockfile

# build هر دو اپ
pnpm --filter @monshim/api build
pnpm --filter @monshim/web build

# تأیید خروجی‌ها قبل از restart
test -f apps/api/dist/src/main.js && echo "✅ backend build"
test -f apps/web/.next/BUILD_ID   && echo "✅ frontend build"
```

> ✅ این سه دستور را واقعاً اجرا کردم و همین خروجی‌ها را تولید می‌کنند.

### ۳-۳. 🔴 restart — `cwd` عوض شده، این را دقیق انجام بده

**مسیر قبلی:** `<project>/back` → **مسیر جدید:** `<project>/apps/api`

اگر `cwd` به‌روز نشود، `.env` لود نمی‌شود و `NODE_ENV` می‌شود `undefined`
→ `synchronize` روشن می‌شود → **خطر روی اسکیمای production**.

**روش الف — با اکوسیستم PM2 (توصیه‌شده):**

`ecosystem.config.js` سرور را ویرایش کن:

```js
module.exports = {
  apps: [
    {
      name: 'monshim-backend',
      cwd: '/var/www/monshim/apps/api', // ← این عوض شد
      script: 'dist/src/main.js',
      env: { NODE_ENV: 'production' }, // ← دو لایه اطمینان
    },
    {
      name: 'monshim-frontend',
      cwd: '/var/www/monshim/apps/web', // ← این عوض شد
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p <پورت_فرانت>',
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

```bash
pm2 delete monshim-backend monshim-frontend
pm2 start ecosystem.config.js
pm2 save
```

**روش ب — بدون فایل اکوسیستم:**

```bash
pm2 delete monshim-backend
cd <project>/apps/api
pm2 start "pnpm start:prod" --name monshim-backend --cwd <project>/apps/api

pm2 delete monshim-frontend
cd <project>/apps/web
pm2 start "pnpm start" --name monshim-frontend --cwd <project>/apps/web

pm2 save
```

### ۳-۴. ✅ تأیید بعد از restart (حتماً انجام بده)

```bash
# ۱) آیا NODE_ENV واقعاً production است؟
pm2 env 0 | grep NODE_ENV        # باید production باشد، نه خالی

# ۲) آیا .env در cwd پروسه پیدا می‌شود؟
ls -l <project>/apps/api/.env

# ۳) سلامت بک‌اند
curl -sf http://127.0.0.1:3000/api/health        && echo "✅ alive"
curl -sf http://127.0.0.1:3000/api/health/ready  && echo "✅ ready"

# ۴) سلامت فرانت
curl -sfI http://127.0.0.1:<پورت_فرانت>/         && echo "✅ frontend"

# ۵) از طریق دامنه (مهم‌تر از localhost)
curl -sf  https://<دامنه>/api/health
curl -sfI https://<دامنه>/uploads/<یک_فایل_موجود>   # ← تصاویر کار می‌کنند؟
```

اگر `/api/health/ready` **۵۰۳** داد، JSON می‌گوید کدام وابستگی خراب است:

```json
{ "status": "degraded", "checks": { "database": "down", "redis": "ok" } }
```

---

## ۴. اگر از Docker استفاده می‌کنی (روش جایگزین)

```bash
cd <project>

# build (context حالا ریشهٔ مخزن است، نه back/)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml build

# بالا آوردن
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d

# بررسی
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml ps
# باید healthy باشد

curl -sf http://127.0.0.1:3000/api/health/ready
```

**قبل از این کار در `.env` بگذار:**

```bash
UPLOAD_DIR=/backend/uploads
UPLOADS_HOST_PATH=/var/lib/monshim/uploads   # ← مسیر مطلق روی هاست
```

> ⚠️ **`docker build` را واقعاً اجرا نکردم** — Docker در محیط من نصب نبود.
> مراحل Dockerfile را دستی و دقیقاً شبیه‌سازی کردم (بدون `apps/web`، مثل
> context واقعی): نصب ✅، build ✅، `dist/src/main.js` ✅.
> ولی خودِ `docker build` **تأیید نشده**. اولین بار روی سرور با احتیاط.

---

## ۵. Rollback

```bash
# سریع‌ترین — برگشت کامل ساختار
cd <project>
git reset --hard pre-monorepo
pnpm install --frozen-lockfile
pnpm --filter @monshim/api build
pnpm --filter @monshim/web build
# سپس cwd را به مسیر قدیمی برگردان و PM2 را restart کن
```

تگ `pre-monorepo` روی GitHub هست.

> ⚠️ **rollback کد، داده را برنمی‌گرداند.** اگر جایی `ALTER TABLE` اجرا شده،
> برگشت کد با اسکیمای جدید هم‌زیستی می‌کند (معمولاً بی‌خطر چون فقط ستون
> اضافه شده). به همین دلیل قاعده: **هر تغییر اسکیما فقط افزودنی باشد**.

---

## ۶. کارهایی که **تأیید نشده‌اند** — صادقانه

این‌ها را «پاس» ثبت نمی‌کنم:

| مورد                     | چرا                                            |
| ------------------------ | ---------------------------------------------- |
| `docker build` واقعی     | Docker در محیط من نبود                         |
| اتصال واقعی MySQL/Redis  | دیتابیس در محیط من نبود                        |
| Nginx / SSL / PM2 واقعی  | روی سرور توست، در مخزن نیست                    |
| تست‌های Playwright و PWA | نیاز به محیط مرورگر                            |
| CI روی GitHub            | فایل آماده است ولی push نشد (مجوز `workflows`) |

**کاری که فقط تو می‌توانی بکنی:**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow"
git push
```

---

## ۷. ترتیب پیشنهادی نهایی

```
۱. بکاپ + تست ری‌استور                 ← حتماً
۲. اجرای PRE-DEPLOY-CHECK.sql          ← حتماً
۳. پیدا کردن ۴ مقدار سرور (بند ۱-۳)    ← حتماً
۴. تنظیم UPLOAD_DIR مطلق + تست .env     ← حتماً
۵. build در یک پوشهٔ release جدا        ← بدون دست زدن به سرویس
۶. تأیید وجود dist/src/main.js و .next  ← قبل از restart
۷. restart با cwd جدید                  ← دقیق
۸. تأیید NODE_ENV + health + uploads    ← حتماً
۹. اگر مشکلی بود: rollback              ← تگ pre-monorepo
```
