import { Star } from 'lucide-react';

import { StarRating } from '@/components/shared/star-rating';
import { toPersianDigits } from '@/lib/utils';
import type { ApiListResponse } from '@/services/api/types';
import type { BarberReview } from '@/services/features/barber/types';

const FA_REVIEW_DATE = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(iso: string) {
  try {
    return FA_REVIEW_DATE.format(new Date(iso));
  } catch {
    return '';
  }
}

/**
 * نظراتِ تاییدشدهٔ سالن در صفحهٔ عمومی.
 * کاملاً سمت سرور رندر می‌شود تا محتوای آن در HTML برای موتورهای جستجو باشد.
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
      <p className="text-sm leading-7 text-muted-foreground">
        هنوز نظری برای {salonName} ثبت نشده است.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-2/50 p-4">
        <div className="flex items-center gap-2">
          <Star size={22} className="fill-yellow-400 text-yellow-400" />
          <span className="text-2xl font-black text-gray-900">
            {toPersianDigits(Number(rating || 0).toFixed(1))}
          </span>
        </div>
        <StarRating rating={rating} size={16} />
        <span className="text-xs text-muted-foreground">
          از مجموع {toPersianDigits(reviewCount)} نظر
        </span>
      </div>

      <ul className="space-y-3">
        {items.map(review => (
          <li
            key={review.id}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary-2 text-xs font-bold text-primary">
                  {(review.customer?.fullName || 'ک').charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {review.customer?.fullName || 'کاربر منشیم'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
              </div>
              <StarRating rating={review.rating} size={12} />
            </div>
            {review.comment && (
              <p className="mt-2 text-xs leading-6 text-gray-600">
                {review.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
