'use client';

import { Check, MessageSquareText, Star, X } from 'lucide-react';
import { useState } from 'react';

import CustomPagination from '@/components/shared/custom-pagination';
import { StarRating } from '@/components/shared/star-rating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';
import {
  useAdminBarberReviews,
  useModerateBarberReview,
} from '@/services/features/barber/admin.hooks';
import type {
  BarberReview,
  BarberReviewStatus,
} from '@/services/features/barber/types';

type StatusFilter = BarberReviewStatus | 'all';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'pending', label: 'در انتظار بررسی' },
  { id: 'approved', label: 'تاییدشده' },
  { id: 'rejected', label: 'ردشده' },
  { id: 'all', label: 'همه' },
];

const STATUS_BADGE: Record<
  BarberReviewStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'در انتظار',
    className: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  },
  approved: {
    label: 'تاییدشده',
    className: 'bg-green-50 text-green-600 border-green-200',
  },
  rejected: {
    label: 'ردشده',
    className: 'bg-red-50 text-red-500 border-red-200',
  },
};

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

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');

  const [rejectTarget, setRejectTarget] = useState<BarberReview | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError } = useAdminBarberReviews({
    page,
    limit: 10,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch.trim() || undefined,
  });

  const moderateMutation = useModerateBarberReview();

  const handleApprove = (review: BarberReview) => {
    moderateMutation.mutate({
      id: review.id,
      dto: { status: 'approved', adminNote: null },
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectTarget) return;

    moderateMutation.mutate(
      {
        id: rejectTarget.id,
        dto: {
          status: 'rejected',
          adminNote: rejectNote.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectNote('');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <MessageSquareText size={18} className="text-primary-600" />
          <h1 className="font-bold text-gray-800">نظرات آرایشگرها</h1>
        </div>
        <Input
          placeholder="جستجو در نظرات، کاربران و سالن‌ها"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="bg-white w-96"
        />
      </div>

      {/* تب‌های وضعیت */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => {
          const active = status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-sm overflow-hidden">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">کاربر</TableHead>
              <TableHead>سالن</TableHead>
              <TableHead className="w-28">امتیاز</TableHead>
              <TableHead>متن نظر</TableHead>
              <TableHead className="w-28">تاریخ</TableHead>
              <TableHead className="w-24">وضعیت</TableHead>
              <TableHead className="w-32">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <div className="h-6 bg-gray-50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-gray-400 py-8"
                >
                  خطا در دریافت نظرات. لطفاً دوباره تلاش کنید.
                </TableCell>
              </TableRow>
            ) : (data?.data?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-gray-400 py-8"
                >
                  نظری یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((review: BarberReview) => {
                const badge = STATUS_BADGE[review.status ?? 'pending'];
                return (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.customer?.fullName || '—'}
                    </TableCell>
                    <TableCell>{review.barber?.salonName || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={review.rating} size={11} />
                        <span className="text-[11px] text-gray-400">
                          ({toFa(review.rating)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-gray-600 leading-5 line-clamp-2 max-w-xs">
                        {review.comment || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(review.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', badge.className)}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {review.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleApprove(review)}
                            disabled={moderateMutation.isPending}
                          >
                            <Check size={13} />
                            تایید
                          </Button>
                        )}
                        {review.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setRejectTarget(review);
                              setRejectNote('');
                            }}
                            disabled={moderateMutation.isPending}
                          >
                            <X size={13} />
                            رد
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7}>
                <CustomPagination
                  totalPages={data?.pagination?.totalPages ?? 1}
                  currentPage={page}
                  onPageChange={setPage}
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* دیالوگ رد نظر */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={open => {
          if (!open) {
            setRejectTarget(null);
            setRejectNote('');
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              رد کردن نظر
            </DialogTitle>
            <DialogDescription>
              نظر ثبت‌شده توسط {rejectTarget?.customer?.fullName || 'کاربر'}{' '}
              برای سالن {rejectTarget?.barber?.salonName || '—'} رد می‌شود.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {rejectTarget?.comment && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 leading-6">
                {rejectTarget.comment}
              </div>
            )}
            <Textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="دلیل رد شدن نظر (اختیاری)"
              rows={3}
              maxLength={500}
              className="resize-none rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setRejectTarget(null);
                setRejectNote('');
              }}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRejectSubmit}
              disabled={moderateMutation.isPending}
            >
              رد کردن نظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
