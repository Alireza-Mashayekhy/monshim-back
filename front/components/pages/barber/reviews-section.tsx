'use client';

import { CheckCircle2, Clock, Star, XCircle } from 'lucide-react';
import { useState } from 'react';

import { RateBarberDialog } from '@/components/pages/barber/rate-barber-dialog';
import { StarRating } from '@/components/shared/star-rating';
import { Button } from '@/components/ui/button';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';
import type { ApiListResponse } from '@/services/api/types';
import { useCurrentUser } from '@/services/features/auth/hooks';
import {
  useBarberReviews,
  useMyBarberReview,
} from '@/services/features/barber/hooks';
import type { BarberReview } from '@/services/features/barber/types';

const REVIEWS_PAGE_SIZE = 10;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

const MyReviewStatusBadge = ({ review }: { review: BarberReview }) => {
  if (review.status === 'pending') {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-700 leading-6">
        <Clock size={15} className="mt-0.5 shrink-0" />
        <span>نظر شما ثبت شد و پس از تایید ادمین نمایش داده می‌شود.</span>
      </div>
    );
  }
  if (review.status === 'rejected') {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600 leading-6">
        <XCircle size={15} className="mt-0.5 shrink-0" />
        <span>
          متأسفانه نظر شما تایید نشد.
          {review.adminNote ? ` (دلیل: ${review.adminNote})` : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3.5 text-xs text-green-700 leading-6">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      <span>نظر شما تایید شد و در لیست نظرات نمایش داده می‌شود.</span>
    </div>
  );
};

const ReviewItem = ({ review }: { review: BarberReview }) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary-2/60 text-primary flex items-center justify-center text-xs font-bold">
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
        <p className="text-xs text-gray-600 leading-6 text-justify">
          {review.comment}
        </p>
      )}
    </div>
  );
};

interface ReviewsSectionProps {
  barberId: number | string;
  rating?: number | null;
  reviewCount?: number | null;
  initialReviews?: ApiListResponse<BarberReview> | null;
}

export function ReviewsSection({
  barberId,
  rating,
  reviewCount,
  initialReviews,
}: ReviewsSectionProps) {
  const { user } = useCurrentUser();
  const [rateOpen, setRateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
  } = useBarberReviews(
    barberId,
    { page, limit: REVIEWS_PAGE_SIZE },
    initialReviews,
  );

  const { data: myReviewData, isLoading: myReviewLoading } = useMyBarberReview(
    barberId,
    Boolean(user),
  );

  const reviews = reviewsData?.data ?? [];
  const total = reviewsData?.pagination?.total ?? reviewCount ?? 0;
  const avgRating = Number(rating ?? 0);
  const myReview = myReviewData?.data?.myReview ?? null;
  const canReview = myReviewData?.data?.canReview ?? false;
  const totalPages = reviewsData?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* خلاصه امتیاز */}
      <div className="rounded-2xl border border-primary-100/60 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gray-900">
              {total > 0 ? toFa(avgRating.toFixed(1)) : '—'}
            </span>
            <span className="text-xs text-gray-400">از ۵</span>
          </div>
          <StarRating rating={avgRating} size={13} className="mt-1" />
          <p className="mt-1 text-[11px] text-gray-400">
            {total > 0
              ? `بر اساس ${toFa(total)} نظر تاییدشده`
              : 'هنوز امتیازی ثبت نشده است'}
          </p>
        </div>

        {user && !myReviewLoading && canReview && (
          <Button size="sm" onClick={() => setRateOpen(true)}>
            <Star size={14} className="fill-current" />
            ثبت نظر
          </Button>
        )}
      </div>

      {/* وضعیت نظر من */}
      {user && !myReviewLoading && myReview && (
        <MyReviewStatusBadge review={myReview} />
      )}

      {/* لیست نظرات */}
      {reviewsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-gray-100" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-2.5 w-full bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      ) : reviewsError ? (
        <div className="py-8 text-center text-xs text-gray-400">
          خطا در دریافت نظرات. لطفاً دوباره تلاش کنید.
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          هنوز نظری ثبت نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            قبلی
          </Button>
          <span className="text-[11px] text-gray-400">
            صفحه {toFa(page)} از {toFa(totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            بعدی
          </Button>
        </div>
      )}

      <RateBarberDialog
        barberId={barberId}
        open={rateOpen}
        onOpenChange={setRateOpen}
      />
    </div>
  );
}

export function ReviewsSectionSkeleton() {
  return (
    <div className={cn('space-y-3 animate-pulse')}>
      <div className="h-20 bg-gray-100 rounded-2xl" />
      <div className="h-24 bg-gray-50 rounded-2xl" />
    </div>
  );
}
