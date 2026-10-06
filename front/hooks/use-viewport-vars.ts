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
    // مقدار آخرین نوشته‌شده؛ اگر تغییر نکرده باشد دیگر استایل را invalidate
    // نمی‌کنیم. بدون این محافظ، هر رویداد scroll/resize یک write روی
    // documentElement انجام می‌داد و مرورگر مجبور می‌شد در همان فریم
    // دوباره layout/style را حساب کند (Forced Reflow).
    let lastHeight = -1;
    let lastTop = -1;
    let lastKeyboard = -1;

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

        /**
         * ⚠️ این سه `if` قلبِ بهینه‌سازی CPU این هوک هستند.
         *
         * `visualViewport.scroll` و `visualViewport.resize` روی موبایل هنگام
         * اسکرول و باز/بسته شدن نوار آدرس مرورگر پشت‌سرهم و در هر فریم
         * fire می‌شوند. نوشتن یک custom property روی `<html>` فقط یک تغییر
         * کوچک نیست: چون این متغیرها ارثی‌اند، مرورگر باید محاسبهٔ استایلِ
         * *همهٔ* عناصر صفحه را از نو انجام بدهد (full style recalc)؛ در یک
         * صفحهٔ سنگین این کار روی رشتهٔ اصلی ده‌ها میلی‌ثانیه طول می‌کشد و
         * همان چیزی است که اسکرول موبایل را به ۱۰۰٪ یک هستهٔ CPU می‌رساند.
         *
         * پس فقط وقتی می‌نویسیم که مقدارِ گِردشده واقعاً عوض شده باشد؛ در
         * اسکرول عادی هیچ‌کدام از این سه مقدار تغییر نمی‌کند و در نتیجه صفر
         * نوشتن و صفر style recalc خواهیم داشت.
         */
        if (height !== lastHeight) {
          root.style.setProperty(VAR_HEIGHT, `${height}px`);
          lastHeight = height;
        }
        if (top !== lastTop) {
          root.style.setProperty(VAR_TOP, `${top}px`);
          lastTop = top;
        }
        if (keyboard !== lastKeyboard) {
          root.style.setProperty(VAR_KEYBOARD, `${keyboard}px`);
          lastKeyboard = keyboard;
        }
      });
    };

    sync();

    // `passive` تضمین می‌کند این شنونده‌ها هرگز اسکرول را بلاک نکنند.
    viewport.addEventListener('resize', sync, { passive: true });
    viewport.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
}
