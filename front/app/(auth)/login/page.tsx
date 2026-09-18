import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import LoginPasswordForm from '@/components/pages/auth/login-password-form';

export const metadata: Metadata = {
  title: 'ورود با رمز عبور | منشیم',
  description:
    'ورود به سامانه هوشمند نوبت‌دهی منشیم با شماره موبایل و رمز عبور',
};

export default function LoginPage() {
  return (
    <AuthCardLayout
      title="ورود به حساب کاربری"
      subtitle="جهت ورود به حساب خود، شماره موبایل و رمز عبور را وارد کنید."
      badgeText="ورود با رمز عبور"
    >
      <LoginPasswordForm />
    </AuthCardLayout>
  );
}
