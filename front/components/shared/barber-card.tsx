import { MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BarberResponse } from '@/services/features/barber/types';

export default function BarberCard({ barber }: { barber: BarberResponse }) {
  return (
    <Link
      key={barber.id}
      href={`/barber/${barber.id}`}
      className="bg-white border w-full border-gray-100 p-2 rounded-2xl shadow-sm flex flex-col gap-2 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="relative aspect-square">
        {barber?.profileImage ? (
          <Image
            fill
            src={process.env.NEXT_PUBLIC_IMAGE_URL + barber?.profileImage}
            alt={barber?.salonName}
            className="w-full h-full rounded-xl object-cover bg-gray-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            بدون تصویر
          </div>
        )}
      </div>
      <div className="px-1">
        <h4 className="font-bold text-gray-800 text-xs truncate">
          {barber?.salonName}
        </h4>
        <p className="text-[10px] text-gray-500 truncate mt-0.5">
          {barber?.fullName}
        </p>
        <div className="flex justify-between items-center mt-2">
          <p className="text-[9px] text-gray-400 flex items-center gap-0.5 truncate">
            <MapPin size={10} />
            {barber.provinceName} - {barber.cityName}
          </p>
        </div>
      </div>
    </Link>
  );
}

export const BarberCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-gray-100 p-3 shadow-sm w-full">
    <div className="aspect-square bg-gray-200 rounded-xl"></div>
    <div className="mt-2 h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="mt-1 h-3 bg-gray-200 rounded w-1/2"></div>
  </div>
);
