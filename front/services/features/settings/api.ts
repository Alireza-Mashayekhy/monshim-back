import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import { PublicSiteSettings, SiteSettings } from './types';

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

export async function getPublicSettings() {
  const { data } = await api.get<PublicSiteSettings>(endpoints.settings.public);

  return data;
}

export async function getPaymentConfig() {
  const { data } = await api.get<PublicSiteSettings>(
    endpoints.settings.paymentConfig,
  );

  return data;
}
