import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface PageHeroProps {
  /** برچسب بالای H1 */
  eyebrow: string;
  /** عنوان اصلی صفحه (H1) — می‌تواند شامل JSX برای رنگی کردن کلیدواژه باشد */
  heading: React.ReactNode;
  description: string;
  imageSrc: string;
  imageAlt: string;
  primaryCta: { href: string; label: string; title: string };
  secondaryCta: { href: string; label: string; title: string };
  highlights: readonly string[];
}

/** بخش قهرمان مشترک صفحات لندینگ داخلی (مدیریت آرایشگاه، رزرو آنلاین) */
export default function PageHero({
  eyebrow,
  heading,
  description,
  imageSrc,
  imageAlt,
  primaryCta,
  secondaryCta,
  highlights,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-2/70 to-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary-2 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 size-96 rounded-full bg-primary-2/70 blur-3xl"
      />

      <div className="custom-container relative grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
        <div className="text-center lg:text-start">
          <p className="mb-5 inline-flex items-center rounded-full border border-primary-200/60 bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
            {eyebrow}
          </p>

          <h1 className="text-[1.6rem] font-black leading-[1.7] text-foreground sm:text-3xl sm:leading-[1.6] lg:text-[2.35rem] lg:leading-[1.6]">
            {heading}
          </h1>

          <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground lg:mx-0">
            {description}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={primaryCta.href} title={primaryCta.title}>
                {primaryCta.label}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-primary-300 bg-white sm:w-auto"
            >
              <Link href={secondaryCta.href} title={secondaryCta.title}>
                {secondaryCta.label}
              </Link>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground lg:justify-start">
            {highlights.map(highlight => (
              <li key={highlight} className="flex items-center gap-1.5">
                <BadgeCheck
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={1400}
            height={768}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-auto w-full rounded-3xl"
          />
        </div>
      </div>
    </section>
  );
}
