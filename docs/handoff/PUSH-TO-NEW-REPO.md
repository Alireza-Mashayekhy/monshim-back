# انتقال به ریپوی جدید — `monshim-monorepo`

**وضعیت:** ⛔ من **نمی‌توانم** پوش کنم. نسخهٔ تمیز آماده و **تست‌شده** است؛ فقط
دو دستور برای تو مانده.

---

## چرا نمی‌توانم

توکن این نشست به ریپوی `monshim` محدود است، نه به حساب تو.

```
$ git clone https://github.com/Alireza-Mashayekhy/monshim-monorepo.git
warning: You appear to have cloned an empty repository.     ← خواندن: ✅

$ git push origin HEAD:refs/heads/main
remote: Permission to Alireza-Mashayekhy/monshim-monorepo.git denied
fatal: ... The requested URL returned error: 403                ← نوشتن: ❌
```

`gh api` روی ریپوی جدید می‌گوید `admin: true`، ولی آن مجوز **داخل خودِ
ریپو** است؛ توکن به آن ریپو دسترسی نوشتن ندارد. ریپوی جدید خالی و public است
(تأیید شد).

**راه‌حل دائمی:** در تنظیمات GitHub App، دسترسی به ریپوی
`monshim-monorepo` را اضافه کن (یا برای نصب، `All repositories`). بعد از آن
می‌توانم خودم پوش کنم.

---

## نسخهٔ تمیز آماده است

| فایل                                       | چیست                                           |
| ------------------------------------------ | ---------------------------------------------- |
| `/home/user/monshim-monorepo-clean.bundle` | **۱۷ مگابایت** — یک کامیت روی `main`، ۷۸۱ فایل |
| `/home/user/monshim-clean-copy/`           | همان محتوا به‌صورت پوشهٔ معمولی (بدون `.git`)  |

**محتوا:** یک کامیت واحد (`chore: initial monorepo structure`) — بدون
تاریخچهٔ ۲۱ کامیتی، بدون `node_modules`، بدون `.turbo`، بدون `dist`/`.next`.

**`ci.yml` هم داخلش هست** — نسخهٔ **بازنویسی‌شده** برای monorepo، نه نسخهٔ کهنه.

---

## ✅ قبل از تحویل، روی همین کامیت تست شد

یک snapshot تمیز (`git archive`) گرفتم و **از صفر** نصب و اجرا کردم:

```
pnpm install --frozen-lockfile   ✅  (۵.۵ ثانیه)
turbo typecheck                  ✅  2/2
turbo test                       ✅  api 352 + 3skip / web 54
turbo build                      ✅  2/2
apps/api/dist/src/main.js        ✅
apps/web/.next/BUILD_ID          ✅
```

بعد از build، `git status` **خالی** بود — یعنی همین یک کامیت برای کار کردن
کافی است و به هیچ فایل جانبی نیاز ندارد.

---

## روش ۱ (توصیه‌شده) — با bundle

```bash
# ۱. دریافت
#    فایل monshim-monorepo-clean.bundle را از workspace دانلود کن
#    (۱۷ مگابایت)

# ۲. کلون از bundle
git clone monshim-monorepo-clean.bundle monshim-monorepo
cd monshim-monorepo

# ۳. وصل کردن به ریپوی واقعی و پوش
git remote set-url origin https://github.com/Alireza-Mashayekhy/monshim-monorepo.git
git push -u origin main
```

**بعدش پاک کردن bundle (اختیاری):**

```bash
rm ../monshim-monorepo-clean.bundle
```

---

## روش ۲ — با پوشهٔ آماده

اگر دانلود bundle سخت است، پوشهٔ `monshim-clean-copy` را بردار:

```bash
cd monshim-clean-copy

git init -b main
git add -A
git -c user.name="Alireza-Mashayekhy" \
    -c user.email="103892222+Alireza-Mashayekhy@users.noreply.github.com" \
    commit -m "chore: initial monorepo structure"

git remote add origin https://github.com/Alireza-Mashayekhy/monshim-monorepo.git
git push -u origin main
```

---

## `ci.yml` — چطور ببرم؟

**جواب کوتاه: از قبل داخل bundle هست. کاری لازم نیست.**

اما اگر خواستی جداگانه اضافه کنی — و **مهم است بدانی کدام نسخه**:

| نسخه           | کجاست                                                    | سالم است؟                                                        |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| نسخهٔ **کهنه** | `.github/workflows/ci.yml` در شاخهٔ `arena/...` روی دیسک | ❌ `working-directory: back` و `front` — این پوشه‌ها حذف شده‌اند |
| نسخهٔ **درست** | `docs/handoff/ci.yml`                                    | ✅ برای monorepo بازنویسی شده                                    |

⚠️ **اگر نسخهٔ کهنه را ببری، اولین CI قرمز می‌شود.**

### نسخهٔ درست چه می‌کند

```
verify : install → typecheck → lint → test
build  : build → تأیید وجود apps/api/dist/src/main.js
                → تأیید وجود apps/web/.next/BUILD_ID
audit  : pnpm audit (فقط اطلاعاتی، بیلد را fail نمی‌کند)
```

### اگر خودت اضافه می‌کنی

```bash
mkdir -p .github/workflows
cp docs/handoff/ci.yml          .github/workflows/ci.yml
cp docs/handoff/dependabot.yml  .github/dependabot.yml
git add .github
git commit -m "ci: add workflow and dependabot"
git push
```

> این `docs/handoff/` در bundle **حذف شده** (چون فایل‌هایش سر جای اصلی
> رفته‌اند). در ریپوی `monshim` اصلی موجود است.

### چرا من نمی‌توانم پوشش کنم

```
! [remote rejected] ... (refusing to allow a GitHub App to create or update
  workflow `.github/workflows/ci.yml` without `workflows` permission)
```

دو مسیر امتحان شد: `git push` و `gh api PUT`. هر دو 403.
این **مستقل از ریپوست** — یک scope توکن است، نه تنظیم ریپو.

**راه‌حل دائمی:** در تنظیمات GitHub App (نه ریپو) مجوز **Workflows** را فعال کن.

---

## بعد از پوش — چک‌لیست

```
۱. Actions → ببین jobها سبز شدند؟
۲. Settings → Branches → branch protection روی main:
   - Require status checks: verify, build
   - Require PR before merge
۳. Settings → Secrets → اگر لازم بود
۴. DEPLOY-CHECKLIST.md را بخوان (مخصوص همین ساختار)
```

---

## نکته‌ای که باید بدانی

نسخهٔ تمیز **تاریخچه ندارد**. یعنی:

✅ مزیت: ریپو تمیز، سبک، بدون کامیت‌های میانیِ بازآرایی
❌ هزینه: `git log` نمی‌تواند بگوید چرا یک تصمیم گرفته شده

اگر روزی خواستی تاریخچه را داشته باشی، در ریپوی قدیمی
(`monshim`, شاخهٔ `arena/bd03e7a3-monshim`) هست — ۲۱ کامیت با توضیحات کامل.
تگ `pre-monorepo` هم آن‌جاست.

اگر **تاریخچه را هم می‌خواهی**، بگو — با
`git push --force https://.../monshim-monorepo.git arena/bd03e7a3-monshim:main`
کل تاریخچه می‌رود (ولی ارور `workflows` ممکن است مانع شود؛ در آن صورت
`git filter-branch` یا کامیت بدون `ci.yml` لازم می‌شود).
