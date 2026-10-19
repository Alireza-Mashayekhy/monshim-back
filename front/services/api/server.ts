import { cookies } from 'next/headers';

import { resolveServerApiBaseUrl } from '@/lib/api-base-url';

interface ServerRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

export class ServerApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ServerApiError';
  }
}

export async function serverFetch<T>(
  url: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  // قبلاً مستقیم از NEXT_PUBLIC_API_URL استفاده می‌شد؛ اگر آن متغیر روی
  // سرور نسبی باشد (`/api`)، fetch سمت سرور «Failed to parse URL» می‌دهد
  // و خطا در SessionHydration بی‌صدا بلعیده می‌شد. resolver مشترک همان
  // منطق public-api را اعمال می‌کند (اولویت با API_URL داخلی سرور).
  const baseUrl = resolveServerApiBaseUrl();
  if (!baseUrl) {
    throw new ServerApiError(
      500,
      'آدرس API سمت سرور تنظیم نشده است (API_URL / NEXT_PUBLIC_API_URL)',
    );
  }
  const cookieStore = await cookies();
  const isFormData = options.body instanceof FormData;

  const headers = new Headers(options.headers);
  headers.set('Cookie', cookieStore.toString());
  if (!isFormData && options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  // Server Components cannot forward rotated Set-Cookie headers to the browser.
  // Refresh only in the browser, otherwise rotating here invalidates its session.
  const res = await fetch(`${baseUrl}/${url.replace(/^\/+/, '')}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body == null
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    cache: options.cache ?? 'no-store',
    next: options.next,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join('، ')
      : body?.message;
    throw new ServerApiError(
      res.status,
      typeof message === 'string' ? message : `Request failed: ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
