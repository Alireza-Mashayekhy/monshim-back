import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import LoginOtpForm from '@/components/pages/auth/login-otp-form';

export const metadata: Metadata = {
  title: 'ورود با کد تأیید | منشیم',
  description:
    'ورود سریع به سامانه نوبت‌دهی منشیم با شماره موبایل و کد یک‌بار مصرف',
};

export default function LoginOtpPage() {
  return (
    <AuthCardLayout
      title="ورود با کد تأیید پیامکی"
      subtitle="شماره موبایل خود را وارد کنید تا کد تأیید برای شما پیامک شود."
      badgeText="ورود سریع و بدون رمز"
    >
      <LoginOtpForm />
    </AuthCardLayout>
  );
}
