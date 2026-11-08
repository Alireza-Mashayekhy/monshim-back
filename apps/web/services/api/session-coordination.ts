/**
 * Only an opaque change marker is stored: neither JWT nor user data ever goes
 * into JavaScript-readable storage. Cookies remain HttpOnly.
 */
export const SESSION_VERSION_KEY = 'monshim:auth-session-version';
const SESSION_CHANNEL = 'monshim:auth-session';
const SESSION_LOCK = 'monshim:auth-cookies';

let localVersion = '';
let channel: BroadcastChannel | null | undefined;
let mutationQueue: Promise<void> = Promise.resolve();

export class SessionChangedError extends Error {
  readonly code = 'ERR_SESSION_CHANGED';

  constructor() {
    super('The authentication session changed while this request was running.');
    this.name = 'SessionChangedError';
  }
}

export class SessionVerificationError extends Error {
  readonly code = 'ERR_SESSION_VERIFICATION';

  constructor() {
    super('The refreshed session could not be verified.');
    this.name = 'SessionVerificationError';
  }
}

function readStoredVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_VERSION_KEY);
  } catch {
    return null;
  }
}

export function getSessionVersion(): string {
  return readStoredVersion() ?? localVersion;
}

/** Responses for an old account must not be applied to the current account. */
export function isCurrentSessionVersion(version: string | undefined): boolean {
  return version === undefined || version === getSessionVersion();
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (channel !== undefined) return channel;
  try {
    channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(SESSION_CHANNEL);
  } catch {
    channel = null;
  }
  return channel;
}

/** Called after successful login, registration, or logout, never after refresh. */
export function markSessionChanged(): void {
  localVersion =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_VERSION_KEY, localVersion);
  } catch {
    // Storage can be disabled in private browsing; BroadcastChannel can still
    // notify other tabs, and this tab continues to use the in-memory marker.
  }
  getChannel()?.postMessage(localVersion);
}

/** Subscribe once per browser query client. Only changes in other tabs arrive. */
export function subscribeToSessionChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let lastSeen = getSessionVersion();
  const accept = (version: unknown) => {
    if (typeof version !== 'string' || version === lastSeen) return;
    localVersion = version;
    lastSeen = version;
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_VERSION_KEY) return;
    accept(readStoredVersion() ?? event.newValue ?? '');
  };
  const onMessage = (event: MessageEvent<unknown>) => {
    accept(readStoredVersion() ?? event.data);
  };
  const sharedChannel = getChannel();
  window.addEventListener('storage', onStorage);
  sharedChannel?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('storage', onStorage);
    sharedChannel?.removeEventListener('message', onMessage);
  };
}

/**
 * Cookie-writing auth requests must not race with login/logout. Web Locks
 * serializes them across same-origin tabs when supported; the local queue also
 * guarantees ordering in this tab and is the fallback in older browsers.
 */
export function withSessionMutation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return await navigator.locks.request(SESSION_LOCK, operation);
    }
    return await operation();
  };
  const result = mutationQueue.then(run, run);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
