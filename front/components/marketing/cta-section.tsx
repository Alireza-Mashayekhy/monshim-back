import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface CtaSectionProps {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryTitle?: string;
  secondaryLabel?: string;
  secondaryTitle?: string;
  secondaryHref?: string;
}

/**
 * بخش فراخوان به اقدام (CTA) مشترک صفحات لندینگ.
 * هدف اصلی تبدیل: ثبت‌نام رایگان آرایشگاه‌ها در منشیم.
 */
export default function CtaSection({
  title,
  description,
  primaryLabel = 'رایگان شروع کنید',
  primaryTitle = 'ثبت‌نام رایگان نوبت دهی آنلاین آرایشگاه در منشیم',
  secondaryLabel = 'مشاهده تعرفه‌ها',
  secondaryTitle = 'تعرفه و قیمت سامانه مدیریت آرایشگاه منشیم',
  secondaryHref = '/pricing',
}: CtaSectionProps) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="custom-container py-16 lg:py-24"
    >
      <div className="relative overflow-hidden rounded-4xl bg-gradient-to-l from-primary to-teal-700 px-6 py-14 text-center shadow-xl shadow-primary/20 sm:px-12 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <h2
            id="cta-heading"
            className="text-2xl font-extrabold leading-relaxed text-white sm:text-3xl lg:text-4xl lg:leading-[1.5]"
          >
            {title}
          </h2>
          <p className="mt-4 leading-8 text-white/85">{description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Link href="/register" title={primaryTitle}>
                {primaryLabel}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/40 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link href={secondaryHref} title={secondaryTitle}>
                {secondaryLabel}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/70">
            راه‌اندازی چند دقیقه‌ای | پشتیبانی آنلاین
          </p>
        </div>
      </div>
    </section>
  );
}
