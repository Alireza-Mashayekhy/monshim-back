import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiListResponse } from '@/services/api/types';

import { CityResponse, ProvinceResponse } from './types';

export async function cityList(id: number) {
  const url = endpoints.locations.cityList(id);
  const { data } = await api.get<ApiListResponse<CityResponse>>(url);

  return data;
}

export async function provinceList() {
  const { data } = await api.get<ApiListResponse<ProvinceResponse>>(
    endpoints.locations.provinceList,
  );

  return data;
}
