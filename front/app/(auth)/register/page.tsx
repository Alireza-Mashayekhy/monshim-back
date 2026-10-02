import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import RegisterForm from '@/components/pages/auth/register-form';
import { sanitizeCallbackUrl } from '@/lib/auth';

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
      title="ایجاد حساب کاربری جدید"
      subtitle="اطلاعات خود را وارد کنید، کد تأیید برای شما ارسال خواهد شد."
      badgeText="عضویت سریع در منشیم"
      callbackUrl={callbackUrl}
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthCardLayout>
  );
}
