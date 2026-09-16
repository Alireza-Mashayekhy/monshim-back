'use client';
import { ChevronDown, Navigation } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { LocationPickerModal } from '@/components/pages/home/LocationPickerModal';
import BarberCard, {
  BarberCardSkeleton,
} from '@/components/shared/barber-card';
import { useHomeBarberList } from '@/services/features/barber/hooks';
import { useLocationStore } from '@/store/useLocationStore';

export default function Home() {
  const { provinceName, cityName, cityId } = useLocationStore();
  const [showLocationModal, setShowLocationModal] = useState(false);

  const {
    data: barbers,
    isLoading,
    isError,
    error,
  } = useHomeBarberList({
    cityId: cityId || undefined,
    limit: 10,
  });

  const bannerImages = [
    'https://images.unsplash.com/photo-1503951914875-befbb7135952?w=800&q=80',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80',
  ];

  const locationDisplayName = cityName
    ? `${cityName}، ${provinceName}`
    : 'انتخاب شهر';

  return (
    <div>
      {/* Header */}
      <div className="px-5 py-2 bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center justify-between w-full">
            <span className="text-gray-500 text-xs">موقعیت مکانی شما</span>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1 text-gray-900 font-bold text-sm cursor-pointer hover:bg-gray-50 rounded p-1 -mr-1 transition-colors"
            >
              <Navigation
                size={14}
                className="text-primary-600 fill-primary-600"
              />
              <span>{locationDisplayName}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Banner Slider */}
      <div className="px-5 mt-4">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar rounded-3xl">
          {bannerImages.map((img, index) => (
            <div
              key={index}
              className="min-w-full snap-center relative aspect-21/9 rounded-3xl overflow-hidden shadow-lg"
            >
              <Image
                src={img}
                alt={`Banner ${index}`}
                className="w-full h-full object-cover"
                fill
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Barbers */}
      <div className="px-5 mt-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">پیشنهادها</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
          {isLoading ? (
            // نمایش اسکلتون‌ها هنگام لودینگ
            Array.from({ length: 4 }).map((_, index) => (
              <BarberCardSkeleton key={index} />
            ))
          ) : isError ? (
            <div className="w-full text-center text-red-500 text-sm py-8">
              خطا در بارگذاری: {error?.message || 'لطفاً مجدداً تلاش کنید'}
            </div>
          ) : barbers?.data?.length === 0 ? (
            <div className="w-full text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-2xl mx-5">
              آرایشگری در این شهر یافت نشد.
            </div>
          ) : (
            barbers?.data?.map(barber => (
              <BarberCard key={barber.id} barber={barber} />
            ))
          )}
        </div>
      </div>

      <LocationPickerModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
      />
    </div>
  );
}
