# =============================================================================
# ایمیج production بک‌اند Monshim
# =============================================================================
# نکته‌های مهم:
#  • Workspace یکتای pnpm نداریم؛ این پوشه (`back/`) ریشهٔ مستقل خودش است.
#    اگر روزی monorepo شد، این فایل باید `COPY` را از ریشه انجام دهد.
#  • نسخهٔ pnpm باید با `packageManager` در `package.json` یکی باشد،
#    وگرنه `--frozen-lockfile` شکست می‌خورد (لاک‌فایل v6 مخصوص pnpm 8 است).
#  • `UPLOAD_DIR` صریح تنظیم می‌شود تا تصاویر آپلودی به `cwd` وابسته نباشند؛
#    در compose یک volume روی همین مسیر mount می‌شود.
#  • ⚠️ این ایمیج تست اجرا نمی‌کند و `shared/` (بردارهای هم‌سانی) را هم
#    ندارد، چون context فقط `back/` است. بیلد و اجرا سالم است (تأییدشده)،
#    اما اگر روزی کسی `pnpm test` را به این فایل اضافه کرد، شکست می‌خورد.
#    در آن صورت `shared/` را هم COPY کنید یا context را به ریشه ببرید.
# =============================================================================
FROM node:22-alpine

WORKDIR /backend

RUN corepack disable

RUN npm config set registry https://package-mirror.liara.ir/repository/npm/

# باید با "packageManager" در package.json یکی باشد.
RUN npm install -g pnpm@8.15.4

# فقط مانیفست‌ها اول کپی می‌شوند تا لایهٔ نصب کش شود
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile \
    --registry https://package-mirror.liara.ir/repository/npm/

COPY . .

RUN pnpm build

EXPOSE 3000

# فایل‌های آپلودی روی volume می‌نشینند (در compose تعریف شده)
ENV UPLOAD_DIR=/backend/uploads

CMD ["pnpm", "start:prod"]
