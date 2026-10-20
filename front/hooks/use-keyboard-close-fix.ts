'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

/**
 * کاهش ارتفاع `visualViewport` بیشتر از این مقدار یعنی کیبورد باز شده است.
 *
 * نوار آدرس/ابزار مرورگر هم موقع اسکرول تا ~۱۰۰px ارتفاع را کم و زیاد می‌کند؛
 * پس آستانه باید از آن بزرگ‌تر و از کوتاه‌ترین کیبورد مجازی (~۲۰۰px)
 * کوچک‌تر باشد.
 */
const KEYBOARD_THRESHOLD = 120;

/** بعد از blur، جمع‌شدن کیبورد کمی طول می‌کشد؛ این‌قدر صبر می‌کنیم. */
const BLUR_DELAY_MS = 350;

function isInputElement(el: Element | null): boolean {
  if (!el) return false;

  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    (el as HTMLElement).isContentEditable
  );
}

/**
 * جلوگیری از «شیت بالاگِیر» بعد از بستن کیبورد موبایل.
 *
 * ## مشکل
 * vaul موقع باز شدن کیبورد، شیت را با استایل اینلاین بالا می‌برد
 * (`style.bottom` و `style.height` روی محتوا می‌نویسد). در vaul 1.1.2
 * موقع بسته‌شدن کیبورد اگر رویداد `resize` قبل از blur برسد یا کیبورد
 * دومرحله‌ای جمع شود، شرط `isInput(activeElement) || keyboardIsOpen`
 * در رویداد آخر برقرار نیست و مقدار `bottom` قبلی روی عنصر باقی می‌ماند؛
 * نتیجه این است که شیت با وجود بسته‌شدن کیبورد سر جای خودش برنمی‌گردد.
 *
 * ## راه‌حل
 * روی همان عنصر به `visualViewport` گوش می‌دهیم و در گذار
 * «کیبورد باز → بسته» استایل‌های اینلاین جاافتاده را پاک می‌کنیم تا
 * شیت به مقدار CSS کلاس خودش (`bottom-0` / `h-auto`) برگردد. اگر vaul
 * خودش درست پاک کرده باشد این تابع عملاً no-op است، پس با رفتار عادی
 * تداخلی ندارد. یک fallback هم روی `focusout` داریم تا اگر رویداد
 * `resize` آخر اصلاً fire نشد، بعد از blur ما پاک‌سازی را انجام دهیم.
 *
 * در همان گذار، اگر مرورگر (معروف است iOS) هنگام باز بودن کیبورد
 * `window` را اسکرول کرده باشد و جا گذاشته باشد، اسکرول را به جای
 * قبل از باز شدن کیبورد برمی‌گردانیم؛ چون اسکرولِ صفحه پشت شیت قفل است،
 * جابه‌جایی `window` در این حالت فقط همان باگ مرورگر است.
 *
 * ````tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useKeyboardCloseFix(ref);
 * ````
 */
export function useKeyboardCloseFix(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    const viewport = window.visualViewport;
    if (!el || !viewport) return;

    // بلندترین ارتفاعِ قابل‌مشاهده از لحاظ باز شدن شیت = مرجع حالتِ
    // «بدون کیبورد». چرخش صفحه یا جمع‌شدن نوار آدرس آن را بالا می‌برد.
    let maxVisibleHeight = Math.round(viewport.height);
    let keyboardWasOpen = false;
    let blurTimer = 0;
    const scrollYBeforeKeyboard = Math.round(window.scrollY);

    // حذف استایل‌های اینلاینی که vaul برای بالابردن شیت می‌نویسد.
    const resetInlinePosition = () => {
      const bottom = Number.parseFloat(el.style.bottom);

      if (!Number.isNaN(bottom) && bottom > 0) {
        el.style.removeProperty('bottom');
      }

      if (el.style.height) {
        el.style.removeProperty('height');
      }
    };

    const sync = () => {
      const visibleHeight = Math.round(viewport.height);

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight;
      }

      const shrink = maxVisibleHeight - visibleHeight;

      if (shrink > KEYBOARD_THRESHOLD) {
        keyboardWasOpen = true;

        return;
      }

      if (keyboardWasOpen) {
        // گذار «کیبورد باز → بسته».
        keyboardWasOpen = false;
        resetInlinePosition();

        // اگر مرورگر صفحه را با باز شدن کیبورد جابه‌جا کرده و جا گذاشته،
        // به موقعیت قبل از کیبورد برمی‌گردانیم (صفحه پشت شیت قفل است).
        if (Math.abs(Math.round(window.scrollY) - scrollYBeforeKeyboard) > 1) {
          window.scrollTo(0, scrollYBeforeKeyboard);
        }
      }
    };

    const onFocusOut = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        // اگر فوکوس به ورودی دیگری رفته باشد کیبورد هنوز باز است؛ کاری نکن.
        if (!isInputElement(document.activeElement)) {
          resetInlinePosition();
        }
      }, BLUR_DELAY_MS);
    };

    viewport.addEventListener('resize', sync, { passive: true });
    el.addEventListener('focusout', onFocusOut);

    return () => {
      viewport.removeEventListener('resize', sync);
      el.removeEventListener('focusout', onFocusOut);
      window.clearTimeout(blurTimer);
    };
  }, [ref]);
}
