'use client';

import { Check, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { COMMON_PLAN_FEATURES, formatToman, PRICING_PLANS } from './plans-data';

/**
 * کارت‌های پلن‌های اشتراک منشیم.
 * قیمت‌ها و سهمیه پیامک عیناً از back/src/subscription/constants.ts.
 */
export default function PricingPlans() {
  return (
    <div>
      {/* امکانات مشترک همه پلن‌ها */}
      <div className="mx-auto mb-10 max-w-3xl rounded-3xl border border-primary-100/60 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-center text-sm font-extrabold text-foreground">
          همه امکانات در همه پلن‌ها فعال است؛ تفاوت فقط در تعداد پیامک ماهانه
          است
        </h3>
        <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {COMMON_PLAN_FEATURES.map(feature => (
            <li
              key={feature}
              className="flex items-start gap-2 text-xs leading-6 text-foreground/90"
            >
              <Check
                className="mt-1 size-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PRICING_PLANS.map(plan => {
          return (
            <li
              key={plan.key}
              className={cn(
                'relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm',
                plan.recommended
                  ? 'border-primary shadow-lg shadow-primary/10 lg:-translate-y-2'
                  : 'border-primary-100/60',
              )}
            >
              {plan.recommended ? (
                <p className="absolute -top-3.5 right-6 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-white shadow">
                  <Sparkles className="size-3" aria-hidden="true" />
                  پیشنهاد ما
                </p>
              ) : null}

              <h2 className="text-base font-extrabold text-foreground">
                {plan.name}
              </h2>
              <p className="mt-1 min-h-10 text-xs leading-6 text-muted-foreground">
                {plan.description}
              </p>

              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary">
                  {formatToman(plan.monthlyPrice)}
                </span>
                <span className="text-xs text-muted-foreground">
                  تومان / ماه
                </span>
              </p>
              <p className="mt-1 text-[11px] font-bold text-primary">
                {plan.bookingsLabel}
              </p>

              {/* سهمیه پیامک — تنها تفاوت واقعی پلن‌ها */}
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-primary-2/70 px-3 py-2.5 text-xs font-bold text-primary">
                <MessageSquare className="size-4" aria-hidden="true" />
                {plan.smsCount.toLocaleString('fa-IR')} پیامک در ماه
              </p>

              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                شامل یادآوری نوبت، ارسال لینک بیعانه و پیام‌های سیستمی
              </p>

              <Button
                asChild
                variant={plan.recommended ? 'default' : 'outline'}
                className="mt-6 w-full"
              >
                <Link
                  href="/register"
                  title={`فعالسازی ${plan.name} نرم افزار مدیریت آرایشگاه منشیم`}
                >
                  انتخاب پلن
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
