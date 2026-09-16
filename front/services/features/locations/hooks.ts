// services/features/locations/hooks.ts
import { useQuery } from '@tanstack/react-query';

import { cityList, provinceList } from './api';

export const useProvinceList = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: provinceList,
    staleTime: 24 * 60 * 60 * 1000, // ۱ روز
    gcTime: 30 * 24 * 60 * 60 * 1000, // ۳۰ روز (جایگزین cacheTime)
  });
};

export const useCityList = (provinceId: number | null) => {
  return useQuery({
    queryKey: ['cities', provinceId],
    queryFn: () => cityList(provinceId!),
    enabled: !!provinceId,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 30 * 24 * 60 * 60 * 1000,
  });
};
