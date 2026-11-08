export type Platform =
  | 'ios-safari'
  | 'ios-chrome'
  | 'ios-other'
  | 'android'
  | 'windows'
  | 'mac-chromium'
  | 'mac-safari'
  | 'other';

/** UA is used only for instructions; the native install button requires the event. */
export function detectPlatform(
  ua: string,
  platform: string,
  maxTouchPoints: number,
): Platform {
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);
  if (ios) {
    if (/CriOS/i.test(ua)) return 'ios-chrome';
    if (/Safari/i.test(ua) && !/FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua))
      return 'ios-safari';
    return 'ios-other';
  }
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) {
    if (/Edg\/|Chrome\//i.test(ua)) return 'mac-chromium';
    if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua))
      return 'mac-safari';
  }
  return 'other';
}

export function supportsMacSafariDock(ua: string): boolean {
  const version = /Version\/(\d+)/i.exec(ua);
  return !!version && Number(version[1]) >= 17;
}

export function iosThirdPartyCanAdd(ua: string): boolean {
  const version = /OS (\d+)[_.](\d+)/i.exec(ua);
  return (
    !!version &&
    (Number(version[1]) > 16 ||
      (Number(version[1]) === 16 && Number(version[2]) >= 4))
  );
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Do not interrupt authentication, booking, payment, account management or deep links. */
export function isInstallSurface(path: string): boolean {
  return [
    '/',
    '/pricing',
    '/privacy',
    '/terms',
    '/tutorials',
    '/provider-management',
    '/online-provider-booking',
    '/panel/home',
    '/dashboard',
  ].includes(path);
}
