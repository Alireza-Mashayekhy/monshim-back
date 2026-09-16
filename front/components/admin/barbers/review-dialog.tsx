'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useBarber,
  useReviewBarber,
} from '@/services/features/barber/admin.hooks';

interface BarberReviewDialogProps {
  barberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BarberReviewDialog({
  barberId,
  open,
  onOpenChange,
}: BarberReviewDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading } = useBarber(barberId ?? '');

  const reviewMutation = useReviewBarber();

  const barber = data?.data;

  useEffect(() => {
    if (!open) {
      setRejectionReason('');
    }
  }, [open]);

  const handleApprove = () => {
    if (!barberId) return;

    reviewMutation.mutate(
      {
        id: barberId,
        dto: {
          isApproved: true,
          rejectionReason: null,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const handleReject = () => {
    if (!barberId) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      return;
    }

    reviewMutation.mutate(
      {
        id: barberId,
        dto: {
          isApproved: false,
          rejectionReason: reason,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>بررسی پروفایل آرایشگر</DialogTitle>
          <DialogDescription>
            اطلاعات آرایشگر را بررسی و پروفایل را تایید یا رد کنید.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : !barber ? (
          <div className="py-10 text-center text-gray-500">
            اطلاعات آرایشگر یافت نشد.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4 rounded-xl border p-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-100">
                {barber.profileImage ? (
                  <img
                    src={barber?.profileImage}
                    alt={barber.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    بدون تصویر
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg">{barber.fullName}</h3>

                <p className="text-sm text-gray-500">{barber.salonName}</p>
              </div>
            </div>

            {/* Information */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem label="نام و نام خانوادگی" value={barber.fullName} />

              <InfoItem label="نام سالن" value={barber.salonName} />

              <InfoItem label="استان" value={barber.province?.name || '-'} />

              <InfoItem label="شهر" value={barber.city?.name || '-'} />

              <InfoItem label="شماره تماس" value={barber?.phone || '-'} />

              <div className="sm:col-span-2">
                <InfoItem label="آدرس" value={barber?.address || '-'} />
              </div>

              <div className="sm:col-span-2">
                <InfoItem label="درباره" value={barber?.bio || '-'} />
              </div>

              {barber.profileImage?.length && (
                <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
                  <p className="mb-1 text-xs text-gray-500">نمونه کارها</p>
                  <div className="grid grid-cols-3 gap-2">
                    {barber.portfolioImages?.map(p => (
                      <img
                        key={p}
                        src={process.env.NEXT_PUBLIC_IMAGE_URL + p}
                        alt={barber.fullName}
                        className="h-full w-full object-cover aspect-square"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current rejection reason */}
            {barber?.rejectionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="mb-1 text-sm font-medium text-red-700">
                  دلیل رد قبلی
                </p>

                <p className="text-sm text-red-600">{barber.rejectionReason}</p>
              </div>
            )}

            {/* Reject reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">دلیل رد پروفایل</label>

              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="در صورت رد کردن پروفایل، دلیل رد را وارد کنید..."
                rows={4}
              />

              <p className="text-xs text-gray-500">
                در صورت تایید، این قسمت نادیده گرفته می‌شود.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reviewMutation.isPending}
          >
            انصراف
          </Button>

          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={
              reviewMutation.isPending ||
              isLoading ||
              !barber ||
              !rejectionReason.trim()
            }
          >
            {reviewMutation.isPending && <Loader2 className="animate-spin" />}
            رد پروفایل
          </Button>

          <Button
            onClick={handleApprove}
            disabled={reviewMutation.isPending || isLoading || !barber}
          >
            {reviewMutation.isPending && <Loader2 className="animate-spin" />}
            تأیید پروفایل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="mb-1 text-xs text-gray-500">{label}</p>

      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
