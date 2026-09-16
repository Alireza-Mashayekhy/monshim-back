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

export interface UsersListResponse {
  data: UserResponse[];
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}
