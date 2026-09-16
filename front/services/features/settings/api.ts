import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import { SiteSettings } from './types';

export async function getSiteSettings() {
  const { data } = await api.get<ApiSingleResponse<SiteSettings>>(
    endpoints.settings.get,
  );

  return data;
}

export async function updateSiteSettings(dto: Partial<SiteSettings>) {
  const { data } = await api.patch<ApiSingleResponse<SiteSettings>>(
    endpoints.settings.update,
    dto,
  );

  return data;
}
