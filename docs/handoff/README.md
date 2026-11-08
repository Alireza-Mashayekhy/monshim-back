# فایل‌های CI که باید **خودت** اضافه کنی

توکن این نشست مجوز `workflows` ندارد. هر دو روش امتحان شد و رد شد:

```
git push          → refusing to allow a GitHub App to create or update
                    workflow `.github/workflows/ci.yml` without `workflows` permission
gh api PUT        → 403 Resource not accessible by integration
```

بنابراین این دو فایل این‌جا آماده گذاشته شده‌اند. **هر دو تست و اعتبارسنجی شده‌اند.**

---

## ۱. `ci.yml` — به `.github/workflows/ci.yml` برود

### ⚠️ نکتهٔ مهم

نسخهٔ قبلی (که در شاخهٔ `arena/...` روی دیسک هست) **کهنه است**:
`working-directory: back` و `front` داشت — این پوشه‌ها دیگر وجود ندارند.
اگر همان را ببری، **اولین push قرمز می‌شود**.

نسخهٔ این‌جا برای ساختار monorepo بازنویسی شده:

| job      | چه کاری                                                                    |
| -------- | -------------------------------------------------------------------------- |
| `verify` | نصب → typecheck → lint → test                                              |
| `build`  | build → تأیید وجود `apps/api/dist/src/main.js` و `apps/web/.next/BUILD_ID` |
| `audit`  | `pnpm audit` — فقط اطلاعاتی، بیلد را fail نمی‌کند                          |

### ✅ تأییدشده

هر گام را روی یک snapshot تمیز (`git archive`) **اجرا کردم**:

```
install    ok
typecheck  2/2
lint       2/2  (0 errors)
test       api 352 + 3skip / web 54
build      2/2
artefacts  هر دو موجود
```

---

## ۲. `dependabot.yml` — به `.github/dependabot.yml` برود

هفتگی، فقط minor/patch، و **majorها ignore** (چون ۵۲ نسخهٔ خودکار می‌تواند
بی‌صدا چیزی را بشکند).

---

## نصب

```bash
mkdir -p .github/workflows
cp docs/handoff/ci.yml          .github/workflows/ci.yml
cp docs/handoff/dependabot.yml  .github/dependabot.yml

git add .github
git commit -m "ci: add workflow and dependabot"
git push
```

---

## چرا نمی‌شود این‌ها را از قبل داخل کنید؟

یک راه دیگر: ریپوی جدید را **از همان ابتدا با دسترسی `workflows`** بساز،
یا در تنظیمات GitHub App (نه خود ریپو) مجوز **Workflows** را فعال کن.
در آن حالت من هم می‌توانم بعداً push کنم.
