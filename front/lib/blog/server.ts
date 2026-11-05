import 'server-only';

import { resolveServerApiBaseUrl } from '@/lib/api-base-url';

import type { BlogArticle } from './types';

export interface PublicBarber {
  id: number;
  slug: string;
  salonName: string;
  profileImage: string | null;
  city?: { name: string } | null;
  rating?: number;
}
async function fetchBlog<T>(path: string): Promise<T | null> {
  const base = resolveServerApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as T;
  } catch {
    return null;
  }
}
export async function getArticle(slug: string): Promise<BlogArticle | null> {
  const base = resolveServerApiBaseUrl();
  if (!base) throw new Error('Blog API is not configured');
  const response = await fetch(`${base}/blog/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Blog API returned ${response.status}`);
  const result = await response.json();
  return result.data as BlogArticle;
}
export const getArticles = async (page: number) => {
  const base = resolveServerApiBaseUrl();
  if (!base) return null;
  try {
    const response = await fetch(`${base}/blog?page=${page}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as {
      data: BlogArticle[];
      pagination: { page: number; totalPages: number };
    };
  } catch {
    return null;
  }
};
export const getBarber = (id: number) =>
  fetchBlog<PublicBarber>(`/blog/barbers/${id}`);
