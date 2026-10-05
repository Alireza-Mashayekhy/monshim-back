'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

/**
 * تشخیص موبایل با `matchMedia`.
 *
 * چرا `useSyncExternalStore` و نه `useState` + `useEffect`؟
 * ۱) خواندن `window.innerWidth` داخل effect باعث یک رندر آبشاری اضافه
 *    می‌شد (lint: react-hooks/set-state-in-effect) و همان رندر، layout را
 *    بی‌دلیل invalidate می‌کرد.
 * ۲) `MediaQueryList.matches` از قبل محاسبه شده است و بدون بازخوانی layout
 *    پاسخ می‌دهد؛ پس نه Forced Reflow دارد و نه listener سراسری resize.
 * ۳) اسنپ‌شات سرور ثابت (`false`) است، پس HTML سرور و رندر اول کلاینت
 *    یکسان‌اند و hydration mismatch رخ نمی‌دهد.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
