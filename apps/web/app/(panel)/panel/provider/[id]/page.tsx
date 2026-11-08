import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/marketing/shared/breadcrumbs';
import BookingWizard from '@/components/pages/barber/booking-wizard';
import { fetchPublicApi } from '@/lib/public-api';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site-config';
import type { ApiListResponse } from '@/services/api/types';
import type { Barber, BarberReview } from '@/services/features/barber/types';

/**
 * این همان صفحهٔ رزرو نوبت آرایشگاه است که **داخل پنل کاربر** نمایش داده
 * می‌شود (`/panel/provider/[id]`). صفحهٔ عمومی و سئوشدهٔ آرایشگاه مسیر
 * مستقلِ خودش (`/provider/[id]`) را دارد و با این صفحه اشتباه گرفته نشود.
 */

/**
 * صفحهٔ خصوصیِ رزرو است و نباید هیچ‌وقت به‌صورت استاتیک کش شود؛ در غیر
 * این صورت اگر یک بار fetch سمت سرور خطا بدهد (مثلاً کانفیگ API روی سرور
 * مشکل داشته باشد)، خروجی `notFound()` همان رندر کش می‌شود و صفحه برای
 * همه ۴۰۴ می‌ماند، حتی وقتی آرایشگاه سالم در دیتابیس هست. در حال حاضر
 * layout پنل به‌خاطر `cookies()` در SessionHydration این مسیر را داینامیک
 * می‌کند، ولی این وابستگی ضمنی را صریح می‌کنیم تا با ریفکتور layout
 * برنگردد. (خودِ دادهٔ آرایشگاه همچنان از Data Cache با revalidate
 * ‏۳۰۰ ثانیه‌ای خوانده می‌شود.)
 */
export const dynamic = 'force-dynamic';
type BarberPageProps = {
  params: Promise<{ id: string }>;
};

function barberPath(id: number) {
  return `/panel/provider/${id}`;
}

async function getBarber(id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return null;
  return fetchPublicApi<Barber>(`/barber/${numericId}`);
}

async function getReviews(id: number) {
  return fetchPublicApi<ApiListResponse<BarberReview>>(
    `/barber/${id}/reviews?page=1&limit=10`,
  );
}

export async function generateMetadata({
  params,
}: BarberPageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  const path =
    Number.isInteger(numericId) && numericId > 0
      ? barberPath(numericId)
      : `/panel/provider/${encodeURIComponent(id)}`;

  // صفحهٔ خصوصی است؛ ایندکس نمی‌شود و کنونیکال به مسیر عمومی اشاره نمی‌کند.
  return buildPageMetadata({
    title: 'رزرو نوبت آرایشگاه',
    description: 'انتخاب خدمات و رزرو نوبت آرایشگاه در منشیم.',
    path,
    noIndex: true,
  });
}

export default async function PanelBarberPage({ params }: BarberPageProps) {
  const { id } = await params;
  const barber = await getBarber(id);
  if (!barber) notFound();
  const initialReviews = await getReviews(barber.id);

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <Breadcrumbs
        items={[
          { href: '/', label: siteConfig.name },
          { href: '/panel/explore', label: 'جست‌وجوی آرایشگاه‌ها' },
          { href: barberPath(barber.id), label: barber.salonName },
        ]}
      />
      <BookingWizard initialBarber={barber} initialReviews={initialReviews} />
    </main>
  );
}
