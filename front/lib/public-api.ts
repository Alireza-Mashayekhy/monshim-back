type ApiEnvelope<T> = {
  data?: T;
  pagination?: unknown;
  status?: number;
  message?: string;
};

/**
 * Fetch data that is intentionally public from the backend during SSR.
 * The server-only API_URL may be used in deployments; the existing public API
 * URL is a fallback. Relative URLs are rejected because fetch() on the server
 * cannot resolve them safely without inventing a host.
 */
export async function fetchPublicApi<T>(path: string): Promise<T | null> {
  const configuredBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!configuredBase || !/^https?:\/\//i.test(configuredBase)) return null;

  const baseUrl = configuredBase.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const response = await fetch(`${baseUrl}${normalizedPath}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<T> | T;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const envelope = payload as ApiEnvelope<T>;
      const data = envelope.data ?? null;

      if (
        data !== null &&
        envelope.pagination !== undefined &&
        (Array.isArray(data) || typeof data === 'object')
      ) {
        return {
          ...(Array.isArray(data) ? {} : data),
          ...(Array.isArray(data) ? { data } : {}),
          status: envelope.status ?? 200,
          message: envelope.message ?? 'success',
          pagination: envelope.pagination,
        } as T;
      }

      return data;
    }

    return payload as T;
  } catch {
    return null;
  }
}

export function absolutePublicImageUrl(imagePath?: string | null) {
  if (!imagePath) return undefined;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const imageBase = process.env.NEXT_PUBLIC_IMAGE_URL;
  if (!imageBase || !/^https?:\/\//i.test(imageBase)) return undefined;

  return `${imageBase.replace(/\/+$/, '')}/${imagePath.replace(/^\/+/, '')}`;
}
