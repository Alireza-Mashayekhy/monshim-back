import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  provinceId: number | null;
  provinceName: string | null;
  cityId: number | null;
  cityName: string | null;
  defaultDismissed: boolean;
  setLocation: (
    provinceId: number,
    provinceName: string,
    cityId: number,
    cityName: string,
  ) => void;
  resetLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    set => ({
      provinceId: null,
      provinceName: null,
      cityId: null,
      cityName: null,
      defaultDismissed: false,
      setLocation: (provinceId, provinceName, cityId, cityName) =>
        set({
          provinceId,
          provinceName,
          cityId,
          cityName,
          defaultDismissed: false,
        }),
      resetLocation: () =>
        set({
          provinceId: null,
          provinceName: null,
          cityId: null,
          cityName: null,
          defaultDismissed: true,
        }),
    }),
    {
      name: 'user-location-storage', // کلید در localStorage
    },
  ),
);
