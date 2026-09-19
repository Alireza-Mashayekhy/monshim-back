import { Metadata } from 'next';

import BarberSignupFlow from '@/components/pages/auth/barbaer/barber-signup-flow';

export const metadata: Metadata = {
  title: 'ثبت‌نام آرایشگر | منشیم',
  description:
    'ثبت‌نام سالن و آرایشگر در سامانه هوشمند نوبت‌دهی منشیم و رزرو آنلاین آرایشگاه',
};

export default function BarberSignupPage() {
  return <BarberSignupFlow />;
}
