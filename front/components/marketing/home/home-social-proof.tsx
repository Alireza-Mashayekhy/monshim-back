import { Quote, Star } from 'lucide-react';

import { PLATFORM_STATS, TESTIMONIALS } from '@/lib/social-proof';

/**
 * نوار اثبات اجتماعی.
 *
 * عدد خام به‌تنهایی شبیه KPI تزئینی دیده می‌شود؛ پس هر عدد یک «زمینهٔ» کوتاه
 * دارد که می‌گوید آن عدد از کجا آمده و چه چیزی را می‌شمارد.
 */
export function HomeStats() {
  return (
    <section
      aria-labelledby="home-stats-heading"
      className="border-y border-primary-100/60 bg-primary-3"
    >
      <h2 id="home-stats-heading" className="sr-only">
        آمار و اعتماد کاربران منشیم
      </h2>
      <div className="custom-container py-10 lg:py-12">
        <dl className="grid gap-6 sm:grid-cols-3 sm:gap-4">
          {PLATFORM_STATS.map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1.5 text-center sm:items-start sm:text-start"
            >
              <dd className="text-3xl font-black text-primary lg:text-4xl">
                {stat.value}
              </dd>
              <dt className="text-sm font-extrabold text-foreground">
                {stat.label}
              </dt>
              <p className="text-[11px] leading-5 text-muted-foreground">
                {stat.context}
              </p>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-primary-100/60 pt-6 sm:flex-row sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span aria-hidden="true" className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            ۴.۹ از ۵ — امتیاز کاربران منشیم
          </p>
          <p className="text-xs text-muted-foreground">
            امتیازها توسط مشتری‌ها در صفحهٔ اختصاصی هر آرایشگاه ثبت می‌شود.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * نظرات کاربران — فقط وقتی نظر واقعی موجود باشد رندر می‌شود.
 * (lib/social-proof.ts را ببینید.)
 */
export function HomeTestimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section aria-labelledby="home-testimonials-heading">
      <div className="custom-container py-16 lg:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2
            id="home-testimonials-heading"
            className="text-2xl font-extrabold leading-[1.6] text-foreground sm:text-3xl"
          >
            نظر کاربران منشیم
          </h2>
        </div>

        <ul className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(item => (
            <li
              key={item.name}
              className="flex flex-col rounded-3xl border border-primary-100/60 bg-white p-6 shadow-sm"
            >
              <Quote
                className="mb-3 size-6 text-primary-2"
                aria-hidden="true"
              />
              <p className="flex-1 text-sm leading-7 text-foreground/90">
                {item.quote}
              </p>
              <div className="mt-5 border-t border-gray-100 pt-4">
                {item.rating ? (
                  <span
                    aria-hidden="true"
                    className="mb-1.5 flex text-amber-400"
                  >
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </span>
                ) : null}
                <p className="text-sm font-extrabold text-foreground">
                  {item.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
