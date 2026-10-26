import { api } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiSingleResponse } from '@/services/api/types';

import { PublicSiteSettings, SiteSettings } from './types';

function unwrapPublicSettings(payload: unknown): PublicSiteSettings {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data &&
    typeof payload.data === 'object'
  ) {
    return payload.data as PublicSiteSettings;
  }
  return payload as PublicSiteSettings;
}

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

export async function getPublicSettings(): Promise<PublicSiteSettings> {
  const { data } = await api.get<
    ApiSingleResponse<PublicSiteSettings> | PublicSiteSettings
  >(endpoints.settings.public);

  return unwrapPublicSettings(data);
}

export async function getPaymentConfig(): Promise<PublicSiteSettings> {
  const { data } = await api.get<
    ApiSingleResponse<PublicSiteSettings> | PublicSiteSettings
  >(endpoints.settings.paymentConfig);

  return unwrapPublicSettings(data);
}
