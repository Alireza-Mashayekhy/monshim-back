'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import type { PublicBarber } from '@/lib/blog/server';
import { publicImageUrlOrPlaceholder } from '@/lib/images';

export default function BarberSlider({
  title,
  barbers,
  autoplay,
}: {
  title: string;
  barbers: PublicBarber[];
  autoplay: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !autoplay ||
      barbers.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setInterval(() => {
      const element = ref.current;
      if (
        !element ||
        document.visibilityState !== 'visible' ||
        element.matches(':hover') ||
        element.contains(document.activeElement)
      )
        return;
      const card = element.querySelector<HTMLElement>('[data-barber-card]');
      if (!card) return;
      const max = element.scrollWidth - element.clientWidth;
      if (Math.abs(element.scrollLeft) >= max - 5)
        element.scrollTo({ left: 0, behavior: 'smooth' });
      else
        element.scrollBy({
          left: -(card.offsetWidth + 12),
          behavior: 'smooth',
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoplay, barbers.length]);
  if (!barbers.length) return null;
  return (
    <section className="my-8">
      <h2 className="text-lg!">{title || 'آرایشگرهای منشیم'}</h2>
      <div ref={ref} className="flex snap-x gap-3 overflow-x-auto pb-2">
        {barbers.map(b => (
          <Link
            key={b.id}
            data-barber-card
            href={`/provider/${encodeURIComponent(b.slug)}`}
            className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border bg-white no-underline!"
          >
            <img
              src={publicImageUrlOrPlaceholder(b.profileImage)}
              alt=""
              className="h-32 w-full object-cover"
            />
            <div className="p-3">
              <strong className="block text-sm">{b.salonName}</strong>
              <span className="text-xs text-muted-foreground">
                {b.city?.name || 'مشاهده صفحه آرایشگر'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
