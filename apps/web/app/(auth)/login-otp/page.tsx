import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import LoginOtpForm from '@/components/pages/auth/login-otp-form';
import { sanitizeCallbackUrl } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'ورود با کد تأیید',
  description:
    'ورود سریع به سامانه نوبت‌دهی منشیم با شماره موبایل و کد یک‌بار مصرف',
};

type LoginOtpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginOtpPage({
  searchParams,
}: LoginOtpPageProps) {
  const callbackUrl = sanitizeCallbackUrl((await searchParams).callbackUrl);

  return (
    <AuthCardLayout
      title="ورود با کد تأیید پیامکی"
      subtitle="شماره موبایل خود را وارد کنید تا کد تأیید برای شما پیامک شود."
      badgeText="ورود سریع و بدون رمز"
      callbackUrl={callbackUrl}
    >
      <LoginOtpForm callbackUrl={callbackUrl} />
    </AuthCardLayout>
  );
}
