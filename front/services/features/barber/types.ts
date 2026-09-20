import { CityResponse, ProvinceResponse } from '../locations/types';

export interface BarberResponse {
  id: string;
  barberProfile?: BarberProfile;
  cityName: string | null;
  provinceName: string | null;
  fullName: string;
  profileImage: string | null;
  salonName: string;
  activityType?: string | null;
  minPrice?: number | null;
  rating?: number | null;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  depositePrice?: number | null;
  durationMinutes: number;
}

export interface Barber {
  id: number;
  name: string;
  salonName: string;
  image: string | null;
  address: string;
  bio: string;
  rating: number;
  reviewCount: number;
  services: Service[];
  portfolio: string[];
  city: CityResponse;
  province: ProvinceResponse;
  userId: number;
}

export interface BarberProfile {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string | null;
  salonName: string;
  provinceId?: number | null;
  cityId?: number | null;
  provinceName?: string | null;
  cityName?: string | null;
  city: CityResponse;
  province: ProvinceResponse;
  address: string;
  bio?: string | null;
  profileImage?: string | null;
  portfolioImages?: string[];
  workStartTime?: string | null;
  workEndTime?: string | null;
  isApproved: boolean;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface UpdateBarberProfile {
  fullName?: string;
  birthDate?: string | null;
  salonName?: string;
  provinceId?: number | null;
  cityId?: number | null;
  address?: string;
  bio?: string | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
  profileImage?: string | null;
  isApproved?: boolean;
  rejectionReason?: string | null;
}

export interface User {
  id: number;
  fullName: string;
  walletBalance: number;
  roles: string[];
  phone: string;
  birthDate?: string | null;
}

export interface Notification {
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR';
}

export type PaymentMethod = 'ONLINE' | 'WALLET';

export interface WorkHours {
  id?: string;
  barberId?: string;
  dayOfWeek: number; // 0=شنبه ... 6=جمعه
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface AvailableSlotsResponse {
  slots: string[];
}

export interface ReviewBarberDto {
  isApproved: boolean;
  rejectionReason?: string | null;
}
