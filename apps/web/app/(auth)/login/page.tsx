import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import LoginPasswordForm from '@/components/pages/auth/login-password-form';
import { sanitizeCallbackUrl } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'ورود با رمز عبور',
  description:
    'ورود به سامانه هوشمند نوبت‌دهی منشیم با شماره موبایل و رمز عبور',
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = sanitizeCallbackUrl((await searchParams).callbackUrl);
  return (
    <AuthCardLayout
      title="ورود به حساب کاربری"
      subtitle="جهت ورود به حساب خود، شماره موبایل و رمز عبور را وارد کنید."
      badgeText="ورود با رمز عبور"
      callbackUrl={callbackUrl}
    >
      <LoginPasswordForm callbackUrl={callbackUrl} />
    </AuthCardLayout>
  );
}
