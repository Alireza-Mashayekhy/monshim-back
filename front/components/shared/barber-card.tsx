import { MapPin, Scissors } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BarberResponse } from '@/services/features/barber/types';

interface BarberCardProps {
  barber: BarberResponse;
  variant?: 'horizontal' | 'vertical';
}

export default function BarberCard({
  barber,
  variant = 'horizontal',
}: BarberCardProps) {
  const imgUrl = barber?.profileImage
    ? barber.profileImage.startsWith('http')
      ? barber.profileImage
      : `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}${barber.profileImage}`
    : null;

  const minPriceFormatted = barber?.minPrice
    ? Number(barber?.minPrice).toLocaleString('en-US')
    : '۱۵۰,۰۰۰';

  if (variant === 'vertical') {
    return (
      <Link
        href={`/barber/${barber.id}`}
        className="group bg-white rounded-xl border border-[#14B8A6]/25 p-2 sm:p-2.5 shadow-2xs hover:shadow-md transition-all flex flex-col active:scale-98"
      >
        <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-[#E6F9F6] flex items-center justify-center">
          {imgUrl ? (
            <Image
              fill
              src={imgUrl}
              alt={barber.salonName || 'آرایشگاه'}
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Scissors size={28} className="text-[#0D9488]/60" />
          )}
        </div>
        <div className="mt-2 space-y-0.5 text-right">
          <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
            {barber.salonName}
          </h4>
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">
            مدیریت: {barber.fullName}
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400">
            {barber.cityName && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={10} />
                {barber.cityName}
              </span>
            )}
            <span className="font-bold text-[#0D9488]">
              از {minPriceFormatted} تومان
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/barber/${barber.id}`}
      className="group bg-white rounded-xl border border-[#14B8A6]/20 p-2 sm:p-3.5 shadow-2xs hover:shadow-md hover:border-[#0D9488]/40 transition-all flex gap-3 sm:gap-4 active:scale-[0.99]"
    >
      <div className="relative w-28 sm:w-32 rounded-lg overflow-hidden shrink-0 bg-[#E6F9F6] border border-gray-100 flex items-center justify-center">
        {imgUrl ? (
          <Image
            fill
            src={imgUrl}
            alt={barber.salonName || 'آرایشگاه'}
            sizes="(max-width: 640px) 120px, 140px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Scissors size={28} className="text-[#0D9488]/50" />
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between self-stretch py-2 text-right min-w-0">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-black text-gray-900 tracking-tight truncate group-hover:text-[#0D9488] transition-colors">
            {barber.salonName}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 font-normal truncate">
            مدیریت: {barber.fullName}
          </p>
          {barber.cityName && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-0.5">
              <MapPin size={11} className="text-gray-400" />
              <span className="truncate">
                {barber.cityName}
                {barber.provinceName && `، ${barber.provinceName}`}
              </span>
            </div>
          )}
        </div>

        <div className="pt-3">
          <span className="text-xs sm:text-sm font-bold text-[#0D9488]">
            از {minPriceFormatted} تومان
          </span>
        </div>
      </div>
    </Link>
  );
}

export const BarberCardSkeleton = ({
  variant = 'horizontal',
}: {
  variant?: 'horizontal' | 'vertical';
}) => {
  if (variant === 'vertical') {
    return (
      <div className="animate-pulse bg-white rounded-2xl border border-gray-100 p-3 shadow-2xs w-full space-y-2">
        <div className="aspect-4/3 bg-gray-200 rounded-xl" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="animate-pulse bg-white rounded-3xl border border-[#14B8A6]/15 p-3 sm:p-3.5 shadow-2xs w-full flex items-center justify-between gap-3">
      <div className="flex-1 space-y-2.5 py-1">
        <div className="h-4 bg-gray-200 rounded-md w-2/3" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2" />
        <div className="h-3 bg-gray-100 rounded-md w-1/3 pt-1" />
        <div className="h-4 bg-teal-100/60 rounded-md w-24 pt-2" />
      </div>
      <div className="w-28 sm:w-32 h-24 sm:h-28 bg-gray-200 rounded-2xl shrink-0" />
    </div>
  );
};
