'use client';

import { useEffect, useState } from 'react';

export interface VisualViewportState {
  /** ارتفاع فضای واقعاً قابل‌مشاهده (با کیبورد باز، کوچک‌تر می‌شود) */
  height: number;
  /** فاصلهٔ بالای فضای قابل‌مشاهده از بالای صفحه (هنگام اسکرول شدن صفحه) */
  top: number;
  /** ارتفاع تقریبی کیبورد */
  keyboardInset: number;
}

const INITIAL_STATE: VisualViewportState = {
  height: 0,
  top: 0,
  keyboardInset: 0,
};

/**
 * پایش visualViewport برای قرار دادن المان‌های ثابت (مثل مودال)
 * در فضای قابل‌مشاهده هنگام باز شدن کیبورد موبایل.
 *
 * مقدار برگشتی تا قبل از اولین اندازه‌گیری صفر است؛
 * در آن حالت از استایل پیش‌فرض المان استفاده کنید.
 */
export function useVisualViewport(enabled = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(INITIAL_STATE);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      const viewport = window.visualViewport;

      const height = Math.round(viewport?.height ?? window.innerHeight);
      const top = Math.round(viewport?.offsetTop ?? 0);
      const keyboardInset = Math.max(0, window.innerHeight - (height + top));

      setState(previous =>
        previous.height === height &&
        previous.top === top &&
        previous.keyboardInset === keyboardInset
          ? previous
          : { height, top, keyboardInset },
      );
    };

    update();

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [enabled]);

  return state;
}
