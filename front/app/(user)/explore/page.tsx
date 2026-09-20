'use client';

import {
  Check,
  CircleDollarSign,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { LocationPickerModal } from '@/components/pages/home/LocationPickerModal';
import BarberCard, {
  BarberCardSkeleton,
} from '@/components/shared/barber-card';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/services/features/auth/hooks';
import { useBarberList } from '@/services/features/barber/hooks';
import { useLocationStore } from '@/store/useLocationStore';

type SortOption =
  | 'createdAt:desc'
  | 'price:asc'
  | 'price:desc'
  | 'rating:desc'
  | 'salonName:asc';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'createdAt:desc', label: 'پیش‌فرض (جدیدترین)' },
  { id: 'price:asc', label: 'ارزان‌ترین' },
  { id: 'price:desc', label: 'گران‌ترین' },
  { id: 'rating:desc', label: 'بالاترین امتیاز' },
  { id: 'salonName:asc', label: 'نام سالن (الف تا ی)' },
];

const toPersianDigits = (num: number | string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, w => farsiDigits[+w]);
};

const normalizeDigits = (str: string): string => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str
    .replace(/[۰-۹]/g, d => String(farsiDigits.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))
    .replace(/[^0-9]/g, '');
};

export default function Explore() {
  const { user } = useCurrentUser();
  const { cityName, cityId, defaultDismissed, resetLocation } =
    useLocationStore();

  const userCityId = user?.cityId ?? user?.city?.id;
  const userCityName = user?.city?.name;

  const effectiveCityId = cityId ?? (defaultDismissed ? undefined : userCityId);
  const effectiveCityName =
    cityName || (!defaultDismissed && !cityId ? userCityName : null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  // حالت‌های فیلتر و سورت
  const [selectedSort, setSelectedSort] =
    useState<SortOption>('createdAt:desc');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');

  // اعمال Debounce روی جستجو
  const debouncedSearch = useDebounce(searchTerm, 400);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useBarberList({
    cityId: effectiveCityId,
    search: debouncedSearch.trim() || undefined,
    sort: selectedSort,
    minPrice: minPrice,
    maxPrice: maxPrice,
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

  // استخراج تمام آرایشگاه‌ها از صفحات
  const barbers = useMemo(
    () => data?.pages.flatMap(page => page.data) || [],
    [data],
  );

  // تعداد کل نتایج
  const totalResults = data?.pages?.[0]?.pagination?.total ?? barbers.length;

  const isPriceActive =
    maxPrice !== undefined || selectedSort.startsWith('price:');

  const pricePillLabel = useMemo(() => {
    if (minPrice !== undefined && maxPrice !== undefined) {
      return `از ${toPersianDigits((minPrice / 1000).toLocaleString('en-US'))} تا ${toPersianDigits((maxPrice / 1000).toLocaleString('en-US'))} هزار ت`;
    }
    if (minPrice !== undefined) {
      return `از ${toPersianDigits((minPrice / 1000).toLocaleString('en-US'))} هزار ت به بالا`;
    }
    if (maxPrice !== undefined) {
      return `تا ${toPersianDigits((maxPrice / 1000).toLocaleString('en-US'))} هزار ت`;
    }
    return 'قیمت';
  }, [minPrice, maxPrice]);

  const handleOpenPriceModal = () => {
    setTempMinPrice(minPrice !== undefined ? String(minPrice) : '');
    setTempMaxPrice(maxPrice !== undefined ? String(maxPrice) : '');
    setShowPriceModal(true);
  };

  const handleApplyPriceFilter = () => {
    const parsedMin = tempMinPrice ? Number(tempMinPrice) : undefined;
    const parsedMax = tempMaxPrice ? Number(tempMaxPrice) : undefined;
    setMinPrice(parsedMin);
    setMaxPrice(parsedMax);
    setShowPriceModal(false);
  };

  const handleClearPriceFilter = () => {
    setTempMinPrice('');
    setTempMaxPrice('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setShowPriceModal(false);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSort('createdAt:desc');
    setMinPrice(undefined);
    setMaxPrice(undefined);
  };

  return (
    <div className="min-h-screen text-right">
      <div className="mx-auto px-4 pt-3 space-y-4">
        {/* ================= REUSABLE PAGE HEADER ================= */}
        <PageHeader title="جستجوی آرایشگر" backHref="/home" />

        {/* ================= SEARCH INPUT ================= */}
        <div className="relative">
          <Input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="سالن"
            className="pr-10"
          />
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={18}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ================= FILTER PILLS ROW ================= */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Pill 1: شهر */}
          {effectiveCityName ? (
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-3.5 py-2 rounded-lg shadow-2xs hover:bg-primary active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <MapPin size={14} />
              <span>شهر: {effectiveCityName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-gray-700 border border-gray-200 px-3.5 py-2 rounded-lg shadow-2xs hover:bg-gray-50 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <MapPin size={14} className="text-gray-500" />
              <span>انتخاب شهر</span>
            </button>
          )}
          <div className="inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleOpenPriceModal}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap',
                isPriceActive
                  ? 'bg-gray-100 text-primary border border-primary/40 font-bold'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 font-semibold',
              )}
            >
              <CircleDollarSign
                size={14}
                className={isPriceActive ? 'text-primary' : 'text-gray-500'}
              />
              <span>{pricePillLabel}</span>
            </button>

            {isPriceActive && (
              <button
                type="button"
                onClick={handleClearPriceFilter}
                aria-label="حذف فیلتر قیمت"
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        {/* ================= RESULTS COUNT & SORT ROW ================= */}
        <div className="flex items-center justify-between pt-1">
          {/* شمارش نتایج واقعی */}
          <span className="text-xs text-gray-500 font-medium">
            {toPersianDigits(totalResults)} نتیجه یافت شد
          </span>

          {/* دکمه باز کردن مرتب‌سازی */}
          <button
            type="button"
            onClick={() => setShowSortModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>مرتب‌سازی</span>
          </button>
        </div>

        {/* ================= BARBER LIST SECTION ================= */}
        <section aria-label="فهرست آرایشگاه‌ها" className="space-y-3 pt-1">
          {isLoading ? (
            // وضعیت بارگذاری اسکلتون
            Array.from({ length: 4 }).map((_, i) => (
              <BarberCardSkeleton key={i} variant="horizontal" />
            ))
          ) : isError ? (
            <div className="bg-white rounded-3xl border border-rose-100 p-8 text-center space-y-3">
              <p className="text-sm font-bold text-rose-600">
                خطا در دریافت لیست سالن‌ها
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs"
              >
                تلاش مجدد
              </Button>
            </div>
          ) : barbers.length === 0 ? (
            // وضعیت واقعی خالی بودن نتایج (بدون دیتای فیک)
            <div className="bg-white rounded-xl border border-primary/20 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 bg-gray-100 text-primary rounded-xl mx-auto flex items-center justify-center">
                <Search size={22} />
              </div>
              <p className="text-sm font-bold text-gray-800">
                هیچ سالنی با این مشخصات یافت نشد
              </p>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                می‌توانید فیلترهای شهر، قیمت یا عبارت جستجو را تغییر دهید تا
                سالن‌های بیشتری ببینید.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button variant="outline" onClick={handleResetFilters}>
                  <RotateCcw size={12} />
                  <span>پاکسازی فیلترها</span>
                </Button>
                {effectiveCityName && (
                  <Button
                    onClick={() => {
                      resetLocation();
                      handleResetFilters();
                    }}
                  >
                    نمایش همه شهرها
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // فهرست کارت‌های واقعی مطابق با search2.png
            <>
              {barbers.map(barber => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  variant="horizontal"
                />
              ))}

              {/* شناساگر انتهای صفحه برای بارگذاری اسکرول نامحدود */}
              <div ref={ref} className="py-2 flex justify-center">
                {isFetchingNextPage && (
                  <div className="w-full space-y-3">
                    <BarberCardSkeleton variant="horizontal" />
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <LocationPickerModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
      />

      <Dialog open={showSortModal} onOpenChange={setShowSortModal}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-3xl p-5 text-right">
          <DialogHeader className="text-right pb-2 border-b border-gray-100">
            <DialogTitle className="text-base font-black text-gray-900 flex items-center gap-2">
              <SlidersHorizontal size={17} className="text-primary" />
              مرتب‌سازی بر اساس
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 pt-2">
            {SORT_OPTIONS.map(opt => {
              const isSelected = selectedSort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedSort(opt.id);
                    setShowSortModal(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer',
                    isSelected
                      ? 'bg-gray-100 text-primary border border-primary/30'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent',
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={16} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ۳. فیلتر قیمت Dialog */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-xl p-5 text-right">
          <DialogHeader className="text-right pb-2 border-b border-gray-100">
            <DialogTitle className="text-base font-black text-gray-900 flex items-center gap-2">
              <CircleDollarSign size={17} className="text-primary" />
              محدوده قیمت (تومان)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* اینپوت‌های حداقل و حداکثر قیمت */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  حداقل قیمت:
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={
                      tempMinPrice
                        ? Number(tempMinPrice).toLocaleString('fa-IR')
                        : ''
                    }
                    onChange={e => {
                      const clean = normalizeDigits(e.target.value);
                      setTempMinPrice(clean);
                    }}
                    placeholder="۰"
                    className="w-full h-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  حداکثر قیمت:
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={
                      tempMaxPrice
                        ? Number(tempMaxPrice).toLocaleString('fa-IR')
                        : ''
                    }
                    onChange={e => {
                      const clean = normalizeDigits(e.target.value);
                      setTempMaxPrice(clean);
                    }}
                    placeholder="بدون سقف"
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* محدوده‌های سریع پیشنهادی */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-gray-500">
                بازهٔ قیمتی آماده:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'تا ۲۰۰ هزار ت', min: undefined, max: 200000 },
                  { label: '۲۰۰ تا ۵۰۰ هزار ت', min: 200000, max: 500000 },
                  { label: '۵۰۰ تا ۱ میلیون ت', min: 500000, max: 1000000 },
                  { label: 'بالای ۱ میلیون ت', min: 1000000, max: undefined },
                ].map(preset => {
                  const isSelected =
                    Number(tempMinPrice || 0) === (preset.min || 0) &&
                    Number(tempMaxPrice || 0) === (preset.max || 0);

                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTempMinPrice(preset.min ? String(preset.min) : '');
                        setTempMaxPrice(preset.max ? String(preset.max) : '');
                      }}
                      className={cn(
                        'py-2 px-2 text-center rounded-lg text-[11px] font-bold border transition-all cursor-pointer',
                        isSelected
                          ? 'bg-gray-100 text-primary border-primary/40'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* دکمه‌های اعمال و پاکسازی */}
            <div className="pt-3 border-t grid grid-cols-2 border-gray-100 gap-2">
              <Button
                type="button"
                onClick={handleApplyPriceFilter}
                className="w-full"
              >
                اعمال فیلتر قیمت
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClearPriceFilter}
              >
                حذف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
