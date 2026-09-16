// store/useBarberSignupStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ServiceInput {
  id: string;
  name: string;
  price: string;
  depositPrice: string;
  duration: string;
}

interface BarberSignupState {
  step: number;
  fullName: string;
  phone: string;
  image: string | null; // base64
  shopName: string;
  cityId: string | null;
  provinceId: string | null;
  provinceName: string;
  cityName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  bio: string;
  portfolio: string[];
  services: ServiceInput[];
  referralCode: string; // کد معرف آرایشگر دعوت کننده
  birthDate: string; // تاریخ تولد (شمسی YYYY/MM/DD)

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (
    data: Partial<
      Omit<
        BarberSignupState,
        'step' | 'setStep' | 'nextStep' | 'prevStep' | 'updateData' | 'reset'
      >
    >,
  ) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  fullName: '',
  phone: '',
  image: null, // اضافه شد
  shopName: '',
  cityId: null,
  provinceId: null,
  provinceName: '',
  cityName: '',
  address: '',
  latitude: null,
  longitude: null,
  bio: '',
  portfolio: [],
  services: [],
  referralCode: '',
  birthDate: '',
};

export const useBarberSignupStore = create<BarberSignupState>()(
  persist(
    set => ({
      ...initialState,
      setStep: step => set({ step }),
      nextStep: () => set(state => ({ step: Math.min(state.step + 1, 5) })),
      prevStep: () => set(state => ({ step: Math.max(state.step - 1, 1) })),
      updateData: data => set(state => ({ ...state, ...data })),
      reset: () => set(initialState),
    }),
    {
      name: 'barber-signup-storage',
    },
  ),
);
