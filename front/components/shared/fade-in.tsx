'use client';

interface Props {
  children: React.ReactNode;
  delay?: number;
}

/**
 * انیمیشن ورود سبک برای بخش‌های صفحه‌های داشبورد.
 *
 * ── چرا دیگر framer-motion نیست؟ ───────────────────────────────────────────
 * این کامپوننت قبلاً با `framer-motion` ساخته شده بود و همان یک fade ساده باعث
 * می‌شد کل رانتایم framer-motion (چند ده کیلوبایت JS، راه‌اندازی حلقهٔ rAF،
 * ساخت لایه‌های کامپوزیت و `will-change` برای هر عنصر) وارد باندل مسیرهای
 * داشبورد شود. اثرش روی CPU هم دو بخش داشت: یک‌بار پردازش/اجرای همان JS در
 * زمان لود، و بعد از آن هزینهٔ هر فریمِ انیمیشن روی رشتهٔ اصلی.
 *
 * حالا همان حرکت (opacity 0→1 و ۲۵ پیکسل بالا→پایین، ۰٫۴۵ ثانیه) با یک
 * `@keyframes` خالص CSS اجرا می‌شود که مرورگر آن را روی کامپوزیتور و بدون
 * درگیر کردن JS انجام می‌دهد. `delay` همان‌طور کار می‌کند و با
 * `animation-fill-mode: both` عنصر در طول تأخیر همان حالت شروع را نگه می‌دارد
 * (رفتار قبلی framer-motion).
 *
 * برای کاربرانی که `prefers-reduced-motion: reduce` دارند، در `globals.css`
 * انیمیشن خاموش می‌شود و محتوا بلافاصله و کامل نشان داده می‌شود.
 */
export default function FadeIn({ children, delay = 0 }: Props) {
  return (
    <div className="animate-fade-up" style={delay ? { animationDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
