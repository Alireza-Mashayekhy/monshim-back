import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  checkPublicPageSlug,
  getMyPublicPageStatus,
  updateMyPublicPageSlug,
} from './api';

export const publicPageKeys = {
  all: ['public-page'] as const,
  status: () => [...publicPageKeys.all, 'status'] as const,
  slugCheck: (slug: string) =>
    [...publicPageKeys.all, 'slug-check', slug] as const,
};

/** وضعیت صفحهٔ عمومی آرایشگرِ جاری (فقط برای نقش آرایشگر) */
export function useMyPublicPageStatus() {
  return useQuery({
    queryKey: publicPageKeys.status(),
    queryFn: getMyPublicPageStatus,
    staleTime: 60 * 1000,
  });
}

/** بررسی زندهٔ تکراری نبودن اسلاگ پیشنهادی */
export function useCheckPublicPageSlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicPageKeys.slugCheck(slug),
    queryFn: () => checkPublicPageSlug(slug),
    enabled: enabled && slug.trim().length > 0,
    staleTime: 10 * 1000,
    retry: false,
  });
}

/** ثبت یا تغییر اسلاگ صفحهٔ عمومی آرایشگر */
export function useUpdatePublicPageSlug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => updateMyPublicPageSlug(slug),
    onSuccess: response => {
      queryClient.setQueryData(publicPageKeys.status(), response);
      void queryClient.invalidateQueries({ queryKey: publicPageKeys.all });
    },
  });
}
