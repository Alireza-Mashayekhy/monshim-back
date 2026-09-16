import { MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BarberResponse } from '@/services/features/barber/types';

export default function BarberCard({ barber }: { barber: BarberResponse }) {
  return (
    <Link
      key={barber.id}
      href={`/barber/${barber.id}`}
      className="group bg-white rounded-xl border border-primary/30 p-2 sm:p-2.5 shadow-2xs hover:shadow-md transition-all flex flex-col"
    >
      <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-primary-2 flex items-center justify-center">
        {barber?.profileImage ? (
          <Image
            fill
            src={process.env.NEXT_PUBLIC_IMAGE_URL + barber?.profileImage}
            alt={barber?.salonName}
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            بدون تصویر
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="text-xs sm:text-sm font-black text-gray-900 truncate">
          {barber?.salonName}
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
          مدیریت: {barber?.fullName}
        </p>
        <p className="text-[10px] text-gray-400 flex items-center gap-1">
          <MapPin size={10} />
          {barber.provinceName} - {barber.cityName}
        </p>
      </div>
    </Link>
  );
}

export const BarberCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-primary/20 p-2.5 animate-pulse space-y-2">
    <div className="aspect-4/3 bg-gray-200 rounded-xl" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-3 bg-gray-100 rounded w-1/2" />
  </div>
);
