export interface sendOtpDto {
  phone: string;
}

export interface sendOtpResponse {
  code: string;
  newUser?: boolean;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface LoginDto {
  phone: string;
  code: string;
}

export interface SignUpDto {
  phone: string;
  code: string;
  fullName: string;
  birthDate?: string;
  provinceId?: number;
  cityId?: number;
}

export interface LoginResponse {
  user: string[];
}

export interface UserResponse {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  birthDate: string;
  isActive: boolean;
  provinceId?: number | null;
  cityId?: number | null;
  province?: {
    id: number;
    name: string;
  } | null;
  city?: {
    id: number;
    name: string;
    provinceId: number;
  } | null;
}
