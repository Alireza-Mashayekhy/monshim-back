/** The auth pages must check a recoverable session just like private pages do. */
export function shouldCheckSession(isPublicPath: boolean, isAuthPage: boolean) {
  return !isPublicPath || isAuthPage;
}

export type SessionGate =
  'ready' | 'checking' | 'error' | 'login' | 'role-redirect' | 'auth-redirect';

/** Keep stale cached users/guests out of redirect decisions while /me is running. */
export function resolveSessionGate({
  isPublicPath,
  isAuthPage,
  isPending,
  isFetching,
  isError,
  hasUser,
  denied,
}: {
  isPublicPath: boolean;
  isAuthPage: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  hasUser: boolean;
  denied: boolean;
}): SessionGate {
  if (!shouldCheckSession(isPublicPath, isAuthPage)) return 'ready';
  if (isError) return 'error';
  if (isPending || isFetching) return 'checking';
  if (!hasUser) return isPublicPath ? 'ready' : 'login';
  if (denied) return 'role-redirect';
  if (isAuthPage) return 'auth-redirect';
  return 'ready';
}
