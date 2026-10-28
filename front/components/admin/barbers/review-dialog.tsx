'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getFullImageUrl } from '@/lib/utils';
import {
  useBarberApprovalDetail,
  useReviewBarber,
} from '@/services/features/barber/admin.hooks';

interface Props {
  barberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BarberReviewDialog({ barberId, open, onOpenChange }: Props) {
  const { data, isLoading } = useBarberApprovalDetail(barberId || '');
  const reviewMutation = useReviewBarber();

  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

  const barber = data?.data;
  const previous = barber?.currentApprovedProfile;
  const isEditReview = Boolean(barber?.isEditReview);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setRejectMode(false);
      setReason('');
    }
    onOpenChange(nextOpen);
  };

  const handleApprove = async () => {
    if (!barberId) return;

    await reviewMutation.mutateAsync({
      id: barberId,
      dto: {
        isApproved: true,
      },
      slug: barber?.slug ?? null,
    });

    handleDialogOpenChange(false);
  };

  const handleReject = async () => {
    if (!barberId) return;

    if (!reason.trim()) {
      toast.error('لطفاً دلیل رد کردن را وارد کنید');
      return;
    }

    await reviewMutation.mutateAsync({
      id: barberId,
      dto: {
        isApproved: false,
        rejectionReason: reason,
      },
      slug: barber?.slug ?? null,
    });

    handleDialogOpenChange(false);
  };

  const avatarSrc = getFullImageUrl(barber?.profileImage);
  const previousAvatarSrc = getFullImageUrl(previous?.profileImage);
  const portfolioImages: string[] = barber?.portfolioImages ?? [];

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditReview
              ? 'بررسی تغییرات جدید پروفایل آرایشگر'
              : 'بررسی اطلاعات آرایشگر'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-10 text-center text-muted-foreground">
            در حال دریافت اطلاعات...
          </div>
        )}

        {barber && (
          <div className="space-y-6 text-sm">
            {isEditReview && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 space-y-1">
                <p className="font-semibold">
                  این آرایشگر از قبل تایید شده و در حال حاضر برای کاربران فعال است.
                </p>
                <p className="text-xs text-amber-800">
                  اطلاعات زیر مقادیر جدید پیشنهادی آرایشگر است. در صورت عدم تایید،
                  نسخهٔ تاییدشدهٔ قبلی همچنان بدون وقفه در سایت نمایش داده می‌شود.
                </p>
              </div>
            )}

            {/* عکس پروفایل */}
            <div className="flex flex-wrap items-center gap-4">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={barber.salonName}
                  className="w-20 h-20 rounded-xl object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  بدون تصویر
                </div>
              )}

              <div>
                <div className="font-semibold text-base">
                  {barber.salonName}
                </div>
                <div className="text-muted-foreground">{barber.fullName}</div>
                {previous && previous.profileImage !== barber.profileImage && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-amber-700">
                    <span>تصویر پروفایل تغییر کرده است</span>
                    {previousAvatarSrc && (
                      <img
                        src={previousAvatarSrc}
                        alt="تصویر قبلی"
                        className="w-8 h-8 rounded-md object-cover border"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* اطلاعات پایه */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                label="نام آرایشگر"
                value={barber.fullName}
                previousValue={
                  previous && previous.fullName !== barber.fullName
                    ? previous.fullName
                    : undefined
                }
              />

              <InfoItem label="شماره تماس" value={barber.phone} />

              <InfoItem
                label="نام سالن"
                value={barber.salonName}
                previousValue={
                  previous && previous.salonName !== barber.salonName
                    ? previous.salonName
                    : undefined
                }
              />

              <InfoItem label="نوع فعالیت" value={barber.activityType} />

              <InfoItem
                label="استان"
                value={barber.province?.name}
                previousValue={
                  previous &&
                  (previous.provinceName ?? null) !==
                    (barber.province?.name ?? null)
                    ? (previous.provinceName ?? '—')
                    : undefined
                }
              />

              <InfoItem
                label="شهر"
                value={barber.city?.name}
                previousValue={
                  previous &&
                  (previous.cityName ?? null) !== (barber.city?.name ?? null)
                    ? (previous.cityName ?? '—')
                    : undefined
                }
              />
            </div>

            {/* آدرس */}
            <InfoBlock
              label="آدرس"
              value={barber.address}
              previousValue={
                previous && previous.address !== barber.address
                  ? previous.address
                  : undefined
              }
            />

            {/* بیو */}
            {(barber.bio || previous?.bio) && (
              <InfoBlock
                label="توضیحات"
                value={barber.bio}
                previousValue={
                  previous && (previous.bio ?? '') !== (barber.bio ?? '')
                    ? (previous.bio || '—')
                    : undefined
                }
              />
            )}

            {/* ساعت کاری */}
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="شروع کار" value={barber.workStartTime} />

              <InfoItem label="پایان کار" value={barber.workEndTime} />
            </div>

            {/* نمونه‌کارها */}
            {(portfolioImages.length > 0 ||
              (previous?.portfolioImages &&
                previous.portfolioImages.length > 0)) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-muted-foreground">
                    نمونه‌کارها
                  </div>
                  {previous &&
                    JSON.stringify(previous.portfolioImages) !==
                      JSON.stringify(portfolioImages) && (
                      <span className="text-xs text-amber-700">
                        تغییر یافته (تعداد قبلی:{' '}
                        {previous.portfolioImages.length} تصویر)
                      </span>
                    )}
                </div>

                {portfolioImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {portfolioImages.map((img, i) => {
                      const fullSrc = getFullImageUrl(img) ?? img;
                      return (
                        <img
                          key={`${img}-${i}`}
                          src={fullSrc}
                          alt={`نمونه‌کار ${i + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-amber-700">
                    تمامی نمونه‌کارهای قبلی در این ویرایش حذف شده‌اند.
                  </div>
                )}
              </div>
            )}

            {/* بخش وارد کردن دلیل رد */}
            {rejectMode && (
              <div className="space-y-2 pt-2">
                <div className="font-medium">
                  {isEditReview
                    ? 'دلیل عدم تایید تغییرات جدید'
                    : 'دلیل رد کردن پروفایل'}
                </div>

                <Textarea
                  placeholder="توضیح دهید چرا این اطلاعات تایید نشده است..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-4">
          {!rejectMode ? (
            <>
              <Button
                variant="destructive"
                onClick={() => setRejectMode(true)}
                disabled={reviewMutation.isPending}
              >
                {isEditReview ? 'رد تغییرات جدید' : 'رد پروفایل'}
              </Button>

              <Button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
              >
                {isEditReview ? 'تایید تغییرات جدید' : 'تایید پروفایل'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRejectMode(false)}>
                انصراف
              </Button>

              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={reviewMutation.isPending}
              >
                ثبت دلیل رد
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  label,
  value,
  previousValue,
}: {
  label: string;
  value?: string | null;
  previousValue?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-medium">{value || '—'}</div>
      {previousValue !== undefined && (
        <div className="text-xs text-amber-700">
          قبلی (فعال در سایت): {previousValue}
        </div>
      )}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  previousValue,
}: {
  label: string;
  value?: string | null;
  previousValue?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="bg-muted/40 rounded-lg p-3 leading-relaxed">
        {value || '—'}
      </div>
      {previousValue !== undefined && (
        <div className="text-xs text-amber-700">
          قبلی (فعال در سایت): {previousValue}
        </div>
      )}
    </div>
  );
}
