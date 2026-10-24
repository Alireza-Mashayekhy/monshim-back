'use client';
import {
  FormProvider as Form,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';

import { useHydrated } from '@/hooks/use-hydrated';
import { captureException } from '@/lib/sentry-client';

type Props = {
  children: React.ReactNode;
  methods: UseFormReturn<any>;
  onSubmit?: SubmitHandler<any>;
  style?: React.CSSProperties;
  className?: string;
  /**
   * تا کامل‌شدن هیدریشن، فرم `inert` می‌ماند.
   *
   * چرا؟ قبل از هیدریشن هیچ handlerای روی فرم نیست؛ پس:
   *   • تایپ کاربر در ورودی‌ها به state فرم نمی‌رسد و React بعد از هیدریشن
   *     مقدار ورودی را با state خالی هم‌تراز می‌کند (متن پاک می‌شود)،
   *   • زدن دکمهٔ submit باعث ارسال native فرم و بارگذاری مجدد صفحه می‌شود.
   *
   * `inert` هر دو مسیر را می‌بندد: نه ورودی‌ها فوکوس/تایپ می‌گیرند و نه
   * دکمه‌ها کلیک/ارسال می‌شوند. (Safari 15.5+ / Chrome 102+ / Firefox 112+)
   * در مرورگرهای قدیمی‌تر این attribute نادیده گرفته می‌شود و رفتار قبلی
   * برمی‌گردد؛ یعنی رگرسیونی اضافه نمی‌شود.
   *
   * فقط برای فرم‌هایی که در اولین رندر SSR حاضرند لازم است (صفحات ورود و
   * ثبت‌نام)؛ فرم‌هایی که بعد از تعامل کاربر باز می‌شوند (drawer/modal) همیشه
   * بعد از هیدریشن mount می‌شوند.
   */
  lockUntilHydrated?: boolean;
};

export default function FormProvider({
  children,
  methods,
  onSubmit,
  style,
  className = '',
  lockUntilHydrated = false,
}: Props) {
  const hydrated = useHydrated();
  const locked = lockUntilHydrated && !hydrated;

  /**
   * `methods.handleSubmit(...)` اگر resolver خطا بدهد (مثلاً chunk مربوط به
   * zod/resolver لود نشود) **reject** می‌شود. قبلاً همان promise مستقیم به
   * `onSubmit` فرم داده می‌شد، یعنی rejection به unhandled rejection تبدیل
   * می‌شد و کاربر هیچ بازخوردی نمی‌گرفت: دکمه را می‌زد و هیچ اتفاقی
   * نمی‌افتاد (بدون toast، بدون خطای اعتبارسنجی، بدون ارسال درخواست).
   *
   * اینجا خطای ارسال/بارگذاری را می‌گیریم، به Sentry می‌فرستیم و به کاربر
   * پیام روشن نشان می‌دهیم.
   */
  const handleFormSubmit = onSubmit
    ? (event: React.FormEvent<HTMLFormElement>) => {
        void methods
          .handleSubmit(onSubmit)(event)
          .catch((error: unknown) => {
            captureException(error);
            toast.error(
              'ارسال فرم انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
            );
          });
      }
    : undefined;

  return (
    <Form {...methods}>
      <form
        onSubmit={handleFormSubmit}
        style={style}
        className={className}
        inert={locked || undefined}
        aria-busy={locked || undefined}
        data-form-locked={locked ? '' : undefined}
      >
        {children}
      </form>
    </Form>
  );
}
