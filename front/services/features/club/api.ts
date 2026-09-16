import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import {
  ApiListResponse,
  ApiSingleResponse,
  PaginationMeta,
} from '@/services/api/types';

import {
  ClubCustomer,
  ClubCustomerQuery,
  ClubGroup,
  CreateClubCustomerDto,
  CreateCustomerGroupDto,
  CreateManualBookingDto,
  UpdateClubCustomerDto,
} from './types';

/** پاسخ‌ها ممکن است به صورت آرایه یا بسته‌ی صفحه‌بندی‌شده باشند */
const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  const nested = (payload as { data?: unknown })?.data;
  if (Array.isArray(nested)) return nested as T[];

  return [];
};

/* ─────────────────────────  گروه‌ها  ───────────────────────── */

export const getClubGroups = async (): Promise<ClubGroup[]> => {
  const { data } = await api.get<
    ApiListResponse<ClubGroup> | ApiSingleResponse<ClubGroup[]>
  >(endpoints.club.groups);

  return extractList<ClubGroup>(data?.data);
};

export const createClubGroup = async (
  dto: CreateCustomerGroupDto,
): Promise<ClubGroup> => {
  const { data } = await api.post<ApiSingleResponse<ClubGroup>>(
    endpoints.club.groups,
    dto,
  );
  return data?.data;
};

export const deleteClubGroup = async (id: string): Promise<void> => {
  await api.delete(endpoints.club.group(id));
};

/* ─────────────────────────  مشتریان  ───────────────────────── */

export const getClubCustomers = async (
  params: ClubCustomerQuery,
): Promise<{ data: ClubCustomer[]; pagination?: PaginationMeta }> => {
  const { data } = await api.get<
    ApiListResponse<ClubCustomer> | ApiSingleResponse<ClubCustomer[]>
  >(endpoints.club.customers, { params });

  const payload = data?.data;
  const list = extractList<ClubCustomer>(payload);

  const pagination: PaginationMeta | undefined = Array.isArray(payload)
    ? (data as ApiListResponse<ClubCustomer>)?.pagination
    : ((payload as { pagination?: PaginationMeta })?.pagination ??
      (data as ApiListResponse<ClubCustomer>)?.pagination);

  return { data: list, pagination };
};

export const addClubCustomer = async (
  dto: CreateClubCustomerDto,
): Promise<ClubCustomer> => {
  const { data } = await api.post<ApiSingleResponse<ClubCustomer>>(
    endpoints.club.customers,
    dto,
  );
  return data?.data;
};

export const updateClubCustomer = async (
  id: string,
  dto: UpdateClubCustomerDto,
): Promise<ClubCustomer> => {
  const { data } = await api.patch<ApiSingleResponse<ClubCustomer>>(
    endpoints.club.customer(id),
    dto,
  );
  return data?.data;
};

export const removeClubCustomer = async (id: string): Promise<void> => {
  await api.delete(endpoints.club.customer(id));
};

/* ───────────────────  ثبت نوبت دستی  ─────────────────── */

export const createManualBooking = async (
  dto: CreateManualBookingDto,
): Promise<unknown> => {
  const { data } = await api.post(endpoints.booking.manual, dto);
  return data;
};
