import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  provinceId: number | null;
  provinceName: string | null;
  cityId: number | null;
  cityName: string | null;
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
      setLocation: (provinceId, provinceName, cityId, cityName) =>
        set({ provinceId, provinceName, cityId, cityName }),
      resetLocation: () =>
        set({
          provinceId: null,
          provinceName: null,
          cityId: null,
          cityName: null,
        }),
    }),
    {
      name: 'user-location-storage', // کلید در localStorage
    },
  ),
);
