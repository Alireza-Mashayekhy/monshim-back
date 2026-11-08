import { AlertTriangle } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import RegisterForm from '@/components/pages/auth/register-form';
import { buildAuthHref, sanitizeCallbackUrl } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'ثبت‌نام حساب کاربری',
  description: 'ثبت‌نام در سامانه هوشمند نوبت‌دهی منشیم و رزرو آنلاین آرایشگاه',
};

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const callbackUrl = sanitizeCallbackUrl((await searchParams).callbackUrl);
  return (
    <AuthCardLayout
      title="ثبت‌نام مشتری"
      subtitle="اطلاعات خود را وارد کنید، کد تأیید برای شما ارسال خواهد شد."
      badgeText="عضویت سریع در منشیم"
      callbackUrl={callbackUrl}
    >
      {/**
       * اخطارِ تفکیک مسیر ثبت‌نام: این فرم فقط برای مشتری است و آرایشگر/صاحب
       * سالن باید از `/provider-signup` ثبت‌نام کند، وگرنه پروفایل سالن ساخته
       * نمی‌شود و بعداً مجبور می‌شود دوباره ثبت‌نام کند.
       *
       * عمداً اینجا (داخل صفحهٔ ثبت‌نام) است و نه در `AuthCardLayout`، چون آن
       * کامپوننت بین `/login` و `/login-otp` هم مشترک است و این اخطار به آن
       * صفحه‌ها ربطی ندارد.
       */}
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
        <AlertTriangle size={15} className="mt-1 shrink-0 text-amber-600" />
        <p>
          <span className="font-bold">آرایشگر یا صاحب سالن هستید؟</span> این فرم
          برای ثبت‌نام مشتری است؛ لطفاً از{' '}
          <Link
            href={buildAuthHref('/provider-signup', callbackUrl)}
            className="font-bold text-amber-900 underline underline-offset-2 transition-colors hover:text-amber-700"
          >
            ثبت‌نام آرایشگر
          </Link>{' '}
          اقدام کنید.
        </p>
      </div>

      <RegisterForm callbackUrl={callbackUrl} />
    </AuthCardLayout>
  );
}
