'use client';

import { ChevronDown, Navigation, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { LocationPickerModal } from '@/components/pages/home/LocationPickerModal';
import BarberCard, {
  BarberCardSkeleton,
} from '@/components/shared/barber-card';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useBarberList } from '@/services/features/barber/hooks';
import { useLocationStore } from '@/store/useLocationStore';

const Explore: React.FC = () => {
  const { provinceName, cityName, cityId } = useLocationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // اعمال Debounce روی جستجو
  const debouncedSearch = useDebounce(searchTerm, 500);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useBarberList({
    cityId: cityId || undefined,
    search: debouncedSearch || undefined,
    limit: 10,
  });

  // Intersection Observer برای تشخیص انتهای لیست
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const locationDisplayName = cityName
    ? `${cityName}، ${provinceName}`
    : 'انتخاب شهر';

  // استخراج لیست باربرها از صفحات
  const barbers = data?.pages.flatMap(page => page.data) || [];

  return (
    <div className="relative">
      <div className="p-5 sticky top-0 bg-white z-10 pb-4 shadow-sm">
        {/* Search Input */}
        <div className="relative flex gap-4">
          <Input
            type="text"
            placeholder="جستجو آرایشگاه ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-10"
          />
          <Search
            className="absolute right-3 top-1.5 text-gray-400"
            size={18}
          />
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1 text-gray-900 font-bold text-sm cursor-pointer hover:bg-gray-50 rounded p-1 -mr-1 transition-colors"
          >
            <Navigation
              size={14}
              className="text-primary-600 fill-primary-600"
            />
            <span className="whitespace-nowrap text-sm">
              {locationDisplayName}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* نمایش اسکلتون در حین بارگذاری اولیه */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <BarberCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-10">
            خطا در بارگذاری اطلاعات
          </div>
        ) : barbers.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            موردی با این مشخصات یافت نشد
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {barbers.map(barber => (
                <BarberCard barber={barber} key={barber.id} />
              ))}
            </div>

            {/* المنت رصد برای بارگذاری صفحات بعدی */}
            <div ref={ref} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                  {[...Array(4)].map((_, i) => (
                    <BarberCardSkeleton key={`skeleton-${i}`} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <LocationPickerModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
      />
    </div>
  );
};

export default Explore;
