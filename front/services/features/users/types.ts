export interface UserResponse {
  id: number;
  fullName: string;
  phone: string;
  roles: string[];
  birthDate: string;
  isActive: boolean;
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
