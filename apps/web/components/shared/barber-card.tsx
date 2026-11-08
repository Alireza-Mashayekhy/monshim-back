'use client';

import {
  Heart,
  Map,
  MessageCircle,
  Scissors,
  Sparkles,
  Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useState } from 'react';

import { getActivityTypeLabel } from '@/constants/activity-types';
import { formatFaNumber } from '@/lib/utils';
import { BarberResponse } from '@/services/features/barber/types';

interface BarberCardProps {
  barber: BarberResponse;
  variant?: 'horizontal' | 'vertical' | 'square';
}

const PROGRESSIVE_BLUR_MASK =
  'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.96) 52%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0) 100%)';

function toFaDigits(value: string | number): string {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, d => map[Number(d)]);
}

function resolveActivityLabel(activityType?: string | null): string | null {
  if (!activityType) return null;
  if (activityType === 'both') return 'آقایان و بانوان';
  return getActivityTypeLabel(activityType) || activityType;
}

function BarberCard({ barber }: BarberCardProps) {
  const [favorited, setFavorited] = useState(false);

  const imgUrl = barber?.profileImage
    ? barber.profileImage.startsWith('http')
      ? barber.profileImage
      : `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}${barber.profileImage}`
    : null;

  const hasPrice =
    barber?.minPrice !== undefined &&
    barber?.minPrice !== null &&
    Number.isFinite(Number(barber.minPrice));
  const minPriceFormatted = hasPrice
    ? formatFaNumber(Number(barber.minPrice))
    : null;

  const ratingValue = Number(barber?.rating ?? 0);
  const reviewCount = Number(barber?.reviewCount ?? 0);
  const servicesCount = Number(barber?.servicesCount ?? 0);
  const activityLabel = resolveActivityLabel(barber?.activityType);

  const locationText = [barber?.cityName, barber?.provinceName]
    .filter(Boolean)
    .join('، ');

  return (
    <article className="group relative aspect-square w-full overflow-hidden rounded-[28px] border border-black/5 bg-slate-900 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.28)] transition-all duration-300 hover:shadow-[0_20px_44px_-12px_rgba(15,23,42,0.38)]">
      {/* لینک تمام‌کارت برای ناوبری و سئو بدون تداخل با دکمه علاقه‌مندی */}
      <Link
        href={`/panel/provider/${barber.id}`}
        aria-label={`مشاهده و رزرو نوبت ${barber.salonName || 'آرایشگاه'}`}
        className="absolute inset-0 z-10 rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      />

      {/* تصویر مربعی ۱:۱ لوگوی آرایشگر */}
      {imgUrl ? (
        <Image
          fill
          src={imgUrl}
          alt={barber.salonName || 'آرایشگاه'}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-br from-[#0f3d3e] via-[#115e59] to-[#0f172a] pt-16">
          <div className="flex size-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xs">
            <Scissors size={34} className="text-white/75" />
          </div>
        </div>
      )}

      {/* سایه ملایم بالا برای خوانایی بج قیمت و قلب روی لوگوهای روشن */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

      {/* نوار شناور بالا: بج قیمت + دکمه علاقه‌مندی */}
      <div className="pointer-events-none absolute inset-x-3.5 top-3.5 z-20 flex items-center justify-between gap-2 sm:inset-x-4 sm:top-4">
        <div className="inline-flex max-w-[75%] items-baseline gap-1 truncate rounded-full border border-white/65 bg-white/88 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
          {hasPrice ? (
            <>
              <span className="text-[11px] font-medium text-gray-600">از</span>
              <span className="text-sm font-black tracking-tight text-gray-950">
                {minPriceFormatted}
              </span>
              <span className="text-[10px] font-medium text-gray-600">
                / تومان
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-gray-900">
              مشاهده خدمات
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFavorited(prev => !prev)}
          aria-label="افزودن به علاقه‌مندی‌ها"
          aria-pressed={favorited}
          className="pointer-events-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/65 bg-white/88 shadow-sm backdrop-blur-md transition-transform hover:scale-105 active:scale-90 sm:size-10"
        >
          <Heart
            size={18}
            strokeWidth={1.9}
            className={
              favorited ? 'fill-rose-500 text-rose-500' : 'text-gray-900'
            }
          />
        </button>
      </div>

      {/* بلور تدریجی پایین کارت + گرادیانت تیره برای کنتراست کامل متن سفید */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] backdrop-blur-xl"
        style={{
          WebkitMaskImage: PROGRESSIVE_BLUR_MASK,
          maskImage: PROGRESSIVE_BLUR_MASK,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-gradient-to-t from-slate-950/92 via-slate-950/68 via-55% to-transparent"
      />

      {/* محتوای پایین کارت */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3.5 text-right sm:p-4">
        {/* ردیف ۱: نام سالن + امتیاز */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-base font-black text-white drop-shadow-2xs sm:text-[17px]">
            {barber.salonName}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-white sm:text-sm">
            <span>
              {reviewCount > 0 ? toFaDigits(ratingValue.toFixed(1)) : 'جدید'}
            </span>
            <Star size={14} className="fill-amber-400 text-amber-400" />
          </div>
        </div>

        {/* ردیف ۲: موقعیت مکانی */}
        {locationText && (
          <div className="flex items-center gap-1.5 text-xs text-white/85">
            <Map size={14} className="shrink-0 text-white/80" />
            <span className="truncate">{locationText}</span>
          </div>
        )}

        {/* ردیف ۳: مشخصات خلاصه سالن */}
        <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1 truncate">
            <Scissors size={12} className="shrink-0 text-white/75" />
            <span>
              {servicesCount > 0
                ? `${formatFaNumber(servicesCount)} خدمت`
                : 'خدمات فعال'}
            </span>
          </span>

          {activityLabel && (
            <span className="inline-flex items-center gap-1 truncate">
              <Sparkles size={12} className="shrink-0 text-white/75" />
              <span>{activityLabel}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 truncate">
            <MessageCircle size={12} className="shrink-0 text-white/75" />
            <span>
              {reviewCount > 0
                ? `${formatFaNumber(reviewCount)} نظر`
                : 'بدون نظر'}
            </span>
          </span>
        </div>

        {/* ردیف ۴: دکمه قرصی سفید رزرو */}
        <div className="mt-1 flex h-10 w-full items-center justify-center rounded-full bg-white text-xs font-black text-gray-950 shadow-md transition-all duration-200 group-hover:bg-gray-50 group-active:scale-[0.98] sm:h-11 sm:text-sm">
          رزرو نوبت
        </div>
      </div>
    </article>
  );
}

/**
 * با `memo` از رندر دوبارهٔ همهٔ کارت‌های یک لیست جلوگیری می‌شود.
 */
export default memo(BarberCard);

export const BarberCardSkeleton = (_props?: {
  variant?: 'horizontal' | 'vertical' | 'square';
}) => {
  return (
    <div className="relative aspect-square w-full animate-pulse overflow-hidden rounded-[28px] border border-gray-200/80 bg-gray-200 shadow-xs">
      <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between sm:inset-x-4 sm:top-4">
        <div className="h-8 w-28 rounded-full bg-white/75" />
        <div className="size-9 rounded-full bg-white/75 sm:size-10" />
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-2.5 bg-gradient-to-t from-gray-400/50 via-gray-300/30 to-transparent p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-2/3 rounded-md bg-white/70" />
          <div className="h-4 w-10 rounded-md bg-white/70" />
        </div>
        <div className="h-3.5 w-1/2 rounded-md bg-white/60" />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="h-3 w-14 rounded bg-white/55" />
          <div className="h-3 w-14 rounded bg-white/55" />
          <div className="h-3 w-14 rounded bg-white/55" />
        </div>
        <div className="mt-1 h-10 w-full rounded-full bg-white/85 sm:h-11" />
      </div>
    </div>
  );
};
