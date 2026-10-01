'use client';
import Link from 'next/link';
import { useState } from 'react';

import SectionHeading from '@/components/marketing/section-heading';
import { Button } from '@/components/ui/button';

const flows = {
  customer: {
    label: 'مشتری',
    href: '/explore',
    cta: 'آرایشگاه را پیدا کنید',
    steps: [
      [
        'آرایشگاه را پیدا کنید',
        'بر اساس شهر، خدمات و قیمت جست‌وجو کنید؛ بدون ورود.',
      ],
      ['خدمت را انتخاب کنید', 'قیمت و مدت هر خدمت را ببینید.'],
      ['زمان را انتخاب کنید', 'روز و ساعت آزاد دلخواهتان را انتخاب کنید.'],
      ['رزرو را قطعی کنید', 'وارد شوید و پرداخت را انجام دهید.'],
    ],
  },
  barber: {
    label: 'آرایشگر',
    href: '/barbaer-signup',
    cta: 'شروع رایگان برای سالن',
    steps: [
      ['ثبت‌نام کنید', 'اطلاعات اصلی خود و سالن را وارد کنید.'],
      ['خدمات و ساعات کاری', 'خدمات، قیمت‌ها و زمان‌های پذیرش را مشخص کنید.'],
      [
        'لینک را به اشتراک بگذارید',
        'پس از تأیید سالن، لینک رزرو را برای مشتری‌ها بفرستید.',
      ],
      ['نوبت‌ها را مدیریت کنید', 'رزروهای آنلاین و حضوری را در یک پنل ببینید.'],
    ],
  },
};

/**
 * بخش «چگونه کار می‌کند؟» — دو ستون موازی مراحل برای آرایشگر و مشتری؛
 * مطابق طرح لندینگ منشیم.
 */
export default function HomeHowItWorks() {
  const [role, setRole] = useState<keyof typeof flows>('customer');
  const flow = flows[role];

  return (
    <section aria-labelledby="home-steps-heading" className="bg-primary-2/40">
      <div className="custom-container py-8 lg:py-14">
        <SectionHeading
          id="home-steps-heading"
          title="چهار قدم تا یک روز منظم‌تر"
        />

        <div
          role="tablist"
          aria-label="مراحل استفاده از منشیم"
          className="mx-auto my-8 flex w-fit gap-2 rounded-2xl border bg-white p-1.5"
        >
          {(Object.keys(flows) as (keyof typeof flows)[]).map(key => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-controls={`panel-${key}`}
              aria-selected={role === key}
              tabIndex={role === key ? 0 : -1}
              onClick={() => setRole(key)}
              onKeyDown={event => {
                if (
                  ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 'customer'
                      : event.key === 'End'
                        ? 'barber'
                        : role === 'customer'
                          ? 'barber'
                          : 'customer';
                  setRole(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
              className={`rounded-xl px-7 py-3 text-sm font-bold ${role === key ? 'bg-primary text-white' : 'text-muted-foreground'}`}
            >
              {flows[key].label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`panel-${role}`}
          aria-labelledby={`tab-${role}`}
          tabIndex={0}
        >
          <ol className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {flow.steps.map(([title, description], index) => (
              <li key={title} className="rounded-2xl border bg-white p-6">
                <span className="text-3xl font-black text-primary/40">
                  {(index + 1).toLocaleString('fa-IR', {
                    minimumIntegerDigits: 2,
                  })}
                </span>
                <h3 className="mt-5 font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Button asChild>
              <Link href={flow.href}>{flow.cta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
