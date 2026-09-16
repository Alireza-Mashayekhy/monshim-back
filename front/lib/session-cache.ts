import type { QueryClient } from '@tanstack/react-query';

import { authKeys } from '@/lib/auth';

/** Keep the observed /me query attached; clear() would detach its subscribers. */
export function clearSessionCache(queryClient: QueryClient) {
  void queryClient.cancelQueries();
  queryClient.removeQueries({
    predicate: query => query.queryKey[0] !== authKeys.me[0],
  });
  queryClient.setQueryData(authKeys.me, {
    status: 200,
    message: '',
    data: null,
  });
}
