'use client';

import { MapPin, SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useCityList,
  useProvinceList,
} from '@/services/features/locations/hooks';
import { useLocationStore } from '@/store/useLocationStore';

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationPickerModal({
  open,
  onOpenChange,
}: LocationPickerModalProps) {
  const { provinceId, cityId, setLocation } = useLocationStore();
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
    provinceId || null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  // دریافت استان‌ها از API
  const { data: provinces, isLoading: provincesLoading } = useProvinceList();

  const { data: cities, isLoading: citiesLoading } =
    useCityList(selectedProvinceId);

  // فیلتر استان‌ها بر اساس جستجو
  const filteredProvinces = useMemo(() => {
    if (!searchQuery) return provinces?.data;
    return provinces?.data?.filter(p => p.name.includes(searchQuery));
  }, [provinces, searchQuery]);

  // فیلتر شهرها بر اساس جستجو (در سمت کلاینت)
  const filteredCities = useMemo(() => {
    if (!searchQuery) return cities?.data;
    return cities?.data?.filter(c => c.name.includes(searchQuery));
  }, [cities, searchQuery]);

  // همگام‌سازی با استور هنگام باز شدن مودال
  useEffect(() => {
    if (provinceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProvinceId(provinceId);
    }
  }, [provinceId]);

  const handleCitySelect = (city: any) => {
    if (selectedProvinceId) {
      const province = provinces?.data?.find(p => p.id === selectedProvinceId);
      if (province) {
        setLocation(province.id, province.name, city.id, city.name);
        onOpenChange(false);
      }
    }
  };
  // نمایش وضعیت بارگذاری
  if (provincesLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl bg-white">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">در حال بارگذاری...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full! max-w-2xl! h-screen flex flex-col p-0 overflow-hidden rounded-none shadow-2xl bg-white gap-0">
        <DialogHeader className="p-4 border-b flex justify-between items-center">
          <DialogTitle className="text-lg font-bold text-gray-800">
            انتخاب استان و شهر
          </DialogTitle>
        </DialogHeader>

        {/* جستجو */}
        <div className="p-4 border-b">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="جستجوی استان یا شهر..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden">
          {/* ستون استان‌ها */}
          <div className="w-1/3 border-l overflow-y-auto p-2 bg-gray-50/50">
            <div className="space-y-1">
              {filteredProvinces?.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvinceId(p.id)}
                  className={cn(
                    'w-full text-right px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                    selectedProvinceId === p.id
                      ? 'bg-primary-100 text-primary-700 font-bold shadow-sm'
                      : 'hover:bg-gray-200/80 text-gray-700',
                  )}
                >
                  {p.name}
                </button>
              ))}
              {filteredProvinces?.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">
                  استانی یافت نشد
                </div>
              )}
            </div>
          </div>

          {/* ستون شهرها */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedProvinceId ? (
              <>
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-2 z-10 border-b mb-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {
                      provinces?.data?.find(p => p.id === selectedProvinceId)
                        ?.name
                    }
                  </span>
                  <span className="text-xs text-primary-600 font-bold">
                    {citiesLoading ? '...' : `${filteredCities?.length} شهر`}
                  </span>
                </div>
                {citiesLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="text-gray-400">
                      در حال بارگذاری شهرها...
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {filteredCities && filteredCities.length > 0 ? (
                      filteredCities?.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleCitySelect(c)}
                          className={cn(
                            'p-3 border rounded-xl text-sm text-right transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:shadow-sm',
                            cityId === c.id &&
                              'border-primary-500 bg-primary-100 text-primary-700 font-bold shadow-sm',
                          )}
                        >
                          {c.name}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-gray-400 py-10">
                        شهری با این نام یافت نشد
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <MapPin className="h-12 w-12 text-gray-300" />
                <span>لطفاً ابتدا یک استان انتخاب کنید</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
