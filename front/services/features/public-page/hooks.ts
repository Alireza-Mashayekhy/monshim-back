import { useQuery } from '@tanstack/react-query';

import { getMyPublicPageStatus } from './api';

export const publicPageKeys = {
  all: ['public-page'] as const,
  status: () => [...publicPageKeys.all, 'status'] as const,
};

/** وضعیت صفحهٔ عمومی آرایشگرِ جاری (فقط برای نقش آرایشگر) */
export function useMyPublicPageStatus() {
  return useQuery({
    queryKey: publicPageKeys.status(),
    queryFn: getMyPublicPageStatus,
    staleTime: 60 * 1000,
  });
}
