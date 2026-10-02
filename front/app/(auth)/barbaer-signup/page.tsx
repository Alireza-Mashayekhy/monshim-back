import { Metadata } from 'next';

import BarberSignupFlow from '@/components/pages/auth/barbaer/barber-signup-flow';
import { sanitizeCallbackUrl } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'ثبت‌نام آرایشگر',
  description:
    'ثبت‌نام سالن و آرایشگر در سامانه هوشمند نوبت‌دهی منشیم و رزرو آنلاین آرایشگاه',
};

type BarberSignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BarberSignupPage({
  searchParams,
}: BarberSignupPageProps) {
  const callbackUrl = sanitizeCallbackUrl((await searchParams).callbackUrl);
  return <BarberSignupFlow callbackUrl={callbackUrl} />;
}
