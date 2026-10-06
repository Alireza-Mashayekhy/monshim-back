'use client';

import { MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn, formatFaNumber } from '@/lib/utils';

import { formatToman, PRICING_PLANS } from './plans-data';

const MIN_BOOKINGS = 10;
const MAX_BOOKINGS = 900;
const DEFAULT_BOOKINGS = 150;

const SLIDER_STEPS = PRICING_PLANS.map(plan => plan.maxBookingsPerMonth);

const toFa = (n: number) => formatFaNumber(n);

/**
 * «پلن مناسب سالن شما» — یک اسلایدر به‌جای مقایسهٔ پنج کارت.
 *
 * تفاوت واقعی پلن‌های منشیم فقط سهمیهٔ پیامک ماهانه است، پس کاربر نباید
 * مجبور باشد پنج کارت را مقایسه کند؛ کافی است بگوید ماهی چند نوبت دارد تا
 * یک پلن مشخص پیشنهاد شود. جدول کامل مقایسه پایین همین صفحه باقی مانده است.
 */
export default function PlanRecommender() {
  const [bookings, setBookings] = useState(DEFAULT_BOOKINGS);

  const plan = useMemo(() => {
    return (
      PRICING_PLANS.find(p => bookings <= p.maxBookingsPerMonth) ??
      PRICING_PLANS[PRICING_PLANS.length - 1]
    );
  }, [bookings]);

  const isTopPlan = plan.key === PRICING_PLANS[PRICING_PLANS.length - 1].key;
  const bookingsLabel = isTopPlan ? `${toFa(bookings)}+` : toFa(bookings);

  return (
    <section
      aria-labelledby="plan-recommender-heading"
      className="custom-container pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-4xl border border-primary-100/60 bg-white p-6 shadow-sm lg:p-10">
        <h2
          id="plan-recommender-heading"
          className="text-center text-xl font-extrabold text-foreground sm:text-2xl"
        >
          پلن مناسب سالن شما
        </h2>
        <p className="mt-2 text-center text-sm leading-7 text-muted-foreground">
          حدوداً ماهی چند نوبت دارید؟ همهٔ امکانات در همهٔ پلن‌ها فعال است و
          تفاوت فقط سهمیهٔ پیامک ماهانه است.
        </p>

        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="monthly-bookings"
              className="text-sm font-bold text-foreground"
            >
              نوبت در ماه
            </label>
            <output
              htmlFor="monthly-bookings"
              className="text-lg font-black text-primary"
            >
              {bookingsLabel}
            </output>
          </div>

          <input
            id="monthly-bookings"
            type="range"
            min={MIN_BOOKINGS}
            max={MAX_BOOKINGS}
            step={5}
            value={bookings}
            onChange={event => setBookings(Number(event.target.value))}
            aria-valuetext={`${bookingsLabel} نوبت در ماه`}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-primary-2 accent-primary"
            style={{
              background: `linear-gradient(to left, var(--primary) ${
                ((bookings - MIN_BOOKINGS) / (MAX_BOOKINGS - MIN_BOOKINGS)) *
                100
              }%, var(--primary-2) ${
                ((bookings - MIN_BOOKINGS) / (MAX_BOOKINGS - MIN_BOOKINGS)) *
                100
              }%)`,
            }}
          />

          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            {SLIDER_STEPS.map(step => (
              <button
                key={step}
                type="button"
                onClick={() => setBookings(step)}
                className={cn(
                  'rounded px-1 py-0.5 transition-colors cursor-pointer hover:text-primary',
                  bookings === step && 'font-black text-primary',
                )}
              >
                {toFa(step)}
                {step === SLIDER_STEPS[SLIDER_STEPS.length - 1] ? '+' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* پلن پیشنهادی */}
        <div className="mt-8 rounded-3xl border-2 border-primary bg-primary-3/60 p-6 text-center">
          <p className="mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-black text-white">
            <Sparkles className="size-3" aria-hidden="true" />
            پلن پیشنهادی شما
          </p>
          <h3 className="text-2xl font-black text-foreground">{plan.name}</h3>
          <p className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black text-primary">
              {formatToman(plan.monthlyPrice)}
            </span>
            <span className="text-xs text-muted-foreground">تومان / ماه</span>
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-primary shadow-2xs">
            <MessageSquare className="size-4" aria-hidden="true" />
            {toFa(plan.smsCount)} پیامک در ماه
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {plan.bookingsLabel}
          </p>

          <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
            <Link
              href="/register"
              title={`فعالسازی ${plan.name} نرم افزار مدیریت آرایشگاه منشیم`}
            >
              شروع رایگان
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          می‌خواهید همهٔ پلن‌ها را کنار هم ببینید؟ جدول کامل مقایسه پایین همین
          صفحه است.
        </p>
      </div>
    </section>
  );
}
