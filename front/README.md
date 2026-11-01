This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## نشست و آزمون احراز هویت

- در `.env.example`، آدرس مرورگر `/api`، پروکسی توسعه `API_PROXY_TARGET` و
  آدرس داخلی SSR با `API_URL` مشخص شده‌اند. برای محصول ترجیحاً `/api` را روی
  همان دامنهٔ فرانت به بک‌اند پروکسی کنید و از یک دامنهٔ canonical استفاده کنید.
- توکن دسترسی ۶ ساعت و رفرش‌توکن ۳۰ روز از آخرین رفرش موفق اعتبار دارند؛ پس
  از بستن و بازکردن مرورگر نیز تا زمان باقی‌بودن کوکی می‌توان وارد پنل شد.
  جزئیات Redis، خروج و سازگاری نشست‌های قدیمی در `../back/ENVIRONMENT.md` است.
- Server Actionهای تازه‌سازی کش عمومی، اعتبار نشست و نقش را با `/auth/me`
  بررسی می‌کنند. اگر API روی هاست دیگری است، کوکی host-only آن به فرانت ارسال
  نمی‌شود؛ وبهوک بک‌اند را با `REVALIDATE_SECRET` تنظیم کنید تا تغییراتی که
  از وبهوک پشتیبانی می‌کنند فوری اعمال شوند؛ بقیه پس از بازهٔ کش تازه می‌شوند.
- تست‌های واحد نشست با Node 22.18+ اجرا می‌شوند:

  ```bash
  pnpm test:session
  ```

- برای تست واقعی مرورگر ابتدا `pnpm exec playwright install chromium` و در صورت
  نیاز وابستگی‌های سیستم Playwright را نصب کنید؛ سپس هر دو سناریو را اجرا کنید:

  ```bash
  pnpm test:session:e2e
  pnpm test:session:e2e:cross-host
  ```

  این تست‌ها ابتدا نسخهٔ production فرانت را در `.next/session-e2e` می‌سازند،
  سپس با یک API ساختگی روی پورت‌های 43101 و 43100 اجرا می‌کنند؛ دیتابیس یا
  دادهٔ واقعی استفاده نمی‌شود.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
