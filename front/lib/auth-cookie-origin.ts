/**
 * Host-only cookies set by an API on another host are invisible to Next's
 * middleware and server components, even when the browser can send them to
 * that API. Ports do not matter for cookies. Be conservative if uncertain:
 * the browser, rather than the server, must then decide whether it is a guest.
 */
export function apiMayUseDifferentCookieHost(
  apiUrl: string | undefined,
  requestHost: string | null,
): boolean {
  const configured = apiUrl?.trim();
  if (!configured) return false; // default /api, on the current host

  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(configured);
  if (!isAbsolute && !configured.startsWith('//')) return false;
  if (!requestHost) return true;

  try {
    const frontend = new URL(`http://${requestHost}`);
    const api = new URL(configured, frontend);
    return api.hostname.toLowerCase() !== frontend.hostname.toLowerCase();
  } catch {
    return true;
  }
}
