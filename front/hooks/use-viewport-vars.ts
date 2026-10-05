'use client';

import { useEffect } from 'react';

/**
 * نام متغیرهای CSS که روی `<html>` نوشته می‌شوند.
 * در `app/globals.css` مقدار پیش‌فرض دارند تا قبل از اجرای JS هم درست کار کنند.
 */
const VAR_HEIGHT = '--vvh';
const VAR_TOP = '--vv-top';
const VAR_KEYBOARD = '--kb';

/**
 * «فضای واقعاً قابل‌مشاهده» را به‌صورت متغیر CSS روی `<html>` نگه می‌دارد:
 *
 * - `--vvh`  : ارتفاع فضای قابل‌مشاهده (با باز شدن کیبورد موبایل کوچک می‌شود)
 * - `--vv-top`: فاصلهٔ بالای آن از بالای صفحه (وقتی مرورگر صفحه را پن می‌کند)
 * - `--kb`   : ارتفاع تقریبی کیبورد
 *
 * چرا متغیر CSS و نه state؟
 * در iOS هنگام باز/بسته شدن کیبورد، `visualViewport` ده‌ها بار در ثانیه
 * `resize` می‌دهد. اگر هر بار state عوض کنیم کل فرم داخل شیت re-render می‌شود
 * و همان لحظه‌ای که کاربر در حال تایپ است لگ می‌زند. اینجا فقط یک استایل روی
 * `<html>` نوشته می‌شود و هیچ re-renderی رخ نمی‌دهد.
 *
 * مصرف‌کننده‌ها: `components/ui/drawer.tsx`، `components/ui/dialog.tsx` و
 * `components/ui/sheet.tsx` از طریق utility های `overlay-fit` و `overlay-center`.
 */
export function useViewportVars() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;

        // «همهٔ خواندن‌ها اول، همهٔ نوشتن‌ها آخر».
        // اگر بین نوشتنِ style و خواندنِ `window.innerHeight` جابه‌جا شویم،
        // مرورگر مجبور می‌شود در همان فریم یک layout اجباری (forced reflow)
        // انجام بدهد؛ در iOS این تابع هنگام باز/بسته شدن کیبورد ده‌ها بار در
        // ثانیه اجرا می‌شود و هزینه‌اش چند برابر می‌شود.
        const height = Math.round(viewport.height);
        const top = Math.round(viewport.offsetTop);
        const keyboard = Math.max(
          0,
          Math.round(window.innerHeight - height - top),
        );

        root.style.setProperty(VAR_HEIGHT, `${height}px`);
        root.style.setProperty(VAR_TOP, `${top}px`);
        root.style.setProperty(VAR_KEYBOARD, `${keyboard}px`);
      });
    };

    sync();

    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
}
