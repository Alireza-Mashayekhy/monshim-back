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
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const referralCode = Array.isArray(params.referralCode)
    ? params.referralCode[0]
    : params.referralCode;

  return (
    <BarberSignupFlow callbackUrl={callbackUrl} referralCode={referralCode} />
  );
}
