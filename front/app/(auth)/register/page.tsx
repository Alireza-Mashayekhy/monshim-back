import { Metadata } from 'next';

import AuthCardLayout from '@/components/pages/auth/auth-card-layout';
import RegisterForm from '@/components/pages/auth/register-form';

export const metadata: Metadata = {
  title: 'ثبت‌نام حساب کاربری | منشیم',
  description: 'ثبت‌نام در سامانه هوشمند نوبت‌دهی منشیم و رزرو آنلاین آرایشگاه',
};

export default function RegisterPage() {
  return (
    <AuthCardLayout
      title="ایجاد حساب کاربری جدید"
      subtitle="اطلاعات خود را وارد کنید، کد تأیید برای شما ارسال خواهد شد."
      badgeText="عضویت سریع در منشیم"
    >
      <RegisterForm />
    </AuthCardLayout>
  );
}
