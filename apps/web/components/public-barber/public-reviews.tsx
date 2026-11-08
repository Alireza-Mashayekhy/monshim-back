import { MessageSquareQuote, Star } from 'lucide-react';
import type { CSSProperties } from 'react';

import { toPersianDigits } from '@/lib/utils';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberReview } from '@/services/features/barber/types';

function cleanSingleLineComment(comment?: string | null): string {
  const normalized = (comment ?? '').replace(/\s+/g, ' ').trim();
  return normalized || 'تجربه موفق رزرو نوبت در این سالن';
}

function ReviewTickerChip({
  review,
  ariaHidden = false,
}: {
  review: BarberReview;
  ariaHidden?: boolean;
}) {
  const authorName = review.customer?.fullName?.trim() || 'کاربر منشیم';
  const initial = authorName.charAt(0);
  const score = toPersianDigits(Number(review.rating || 5).toFixed(1));
  const text = cleanSingleLineComment(review.comment);

  return (
    <div
      dir="rtl"
      aria-hidden={ariaHidden || undefined}
      className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-primary/15 bg-white px-4 py-2.5 shadow-2xs"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-2 text-xs font-black text-primary">
        {initial}
      </span>

      <span className="text-xs font-black text-gray-900">{authorName}</span>

      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
        <Star size={11} className="fill-amber-400 text-amber-400" />
        {score}
      </span>

      <span aria-hidden="true" className="text-gray-300">
        •
      </span>

      <span className="text-xs leading-none text-gray-600">{text}</span>
    </div>
  );
}

/**
 * نمایش نظرات تاییدشدهٔ مشتریان به صورت نوار تک‌خطی متحرک و آرام (مشابه زیرنویس خبر / لوگوهای همکاران).
 * تمام محتوا سمت سرور در HTML رندر می‌شود تا برای موتورهای جستجو نیز قابل ایندکس باشد.
 */
export default function PublicReviews({
  reviews,
  rating,
  reviewCount,
  salonName,
}: {
  reviews: ApiListResponse<BarberReview> | null;
  rating: number;
  reviewCount: number;
  salonName: string;
}) {
  const items = reviews?.data ?? [];

  if (reviewCount === 0 || items.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3.5 text-xs text-muted-foreground">
        <MessageSquareQuote size={16} className="shrink-0 text-primary/70" />
        <span>هنوز دیدگاهی برای {salonName} ثبت نشده است.</span>
      </div>
    );
  }

  // تضمین پر بودن عرض صفحه حتی زمانی که فقط ۱ تا ۵ نظر ثبت شده باشد
  const repeatCount = Math.max(1, Math.ceil(6 / items.length));
  const trackItems: { review: BarberReview; isDuplicate: boolean }[] = [];
  for (let r = 0; r < repeatCount; r += 1) {
    items.forEach(review => {
      trackItems.push({ review, isDuplicate: r > 0 });
    });
  }

  // سرعت آرام و یکنواخت متناسب با تعداد آیتم‌های نوار
  const durationSeconds = Math.max(34, trackItems.length * 6.5);

  const edgeFadeMask =
    'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)';

  return (
    <div className="space-y-3">
      {/* نوار خلاصه امتیاز بالای تیکر */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs text-muted-foreground">
          دیدگاه‌های واقعی مشتریان ({toPersianDigits(reviewCount)} نظر ثبت‌شده)
        </span>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-2/70 px-3 py-1 text-xs font-bold text-gray-900">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span>{toPersianDigits(Number(rating || 0).toFixed(1))}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            از ۵
          </span>
        </div>
      </div>

      {/* نوار تک‌خطی متحرک (Ticker / Marquee) */}
      <div
        dir="ltr"
        className="relative w-full overflow-hidden py-1.5"
        style={{
          WebkitMaskImage: edgeFadeMask,
          maskImage: edgeFadeMask,
        }}
      >
        <div
          className="animate-reviews-ticker flex w-max items-center"
          style={
            {
              '--ticker-duration': `${durationSeconds}s`,
            } as CSSProperties
          }
        >
          {/* نیمهٔ اول (اصلی) */}
          <div className="flex shrink-0 items-center gap-3 pr-3">
            {trackItems.map((entry, idx) => (
              <ReviewTickerChip
                key={`primary-${entry.review.id}-${idx}`}
                review={entry.review}
                ariaHidden={entry.isDuplicate}
              />
            ))}
          </div>

          {/* نیمهٔ دوم (قرینهٔ بی‌وقفه، مخفی از اسکرین‌ریدر و بات سئو) */}
          <div
            aria-hidden="true"
            className="flex shrink-0 items-center gap-3 pr-3"
          >
            {trackItems.map((entry, idx) => (
              <ReviewTickerChip
                key={`mirror-${entry.review.id}-${idx}`}
                review={entry.review}
                ariaHidden
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
