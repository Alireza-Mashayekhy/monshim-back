export interface ApiListResponse<T> {
  status: number;
  message: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiSingleResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
