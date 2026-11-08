'use client';

import { useSyncExternalStore } from 'react';

/**
 * فقط یک بار subscribe لازم است؛ این hook یک وضعیت سراسری (هیدریشن شده یا نه)
 * را می‌خواند و به رویدادی برای گوش دادن نیاز ندارد.
 */
const subscribeToHydration = () => () => {};

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * آیا React هیدریشن سمت کلاینت را کامل کرده است؟
 *
 * ── چرا این hook لازم شد؟ ──────────────────────────────────────────────────
 * تا قبل از پایان هیدریشن، React هیچ listenerای روی DOM ندارد. اگر کاربر در
 * این بازه داخل یک ورودی کنترل‌شده تایپ کند:
 *   ۱) `react-hook-form` از تایپ باخبر نمی‌شود و مقدار واردشده در state فرم
 *      نمی‌نشیند.
 *   ۲) لحظه‌ای که هیدریشن کامل می‌شود، React مقدار داخل ورودی را با state
 *      (که خالی است) هم‌تراز می‌کند و **متن تایپ‌شده پاک می‌شود**.
 *   ۳) اگر کاربر در همان بازه دکمهٔ submit را بزند، چون handlerای وصل نیست،
 *      مرورگر فرم را به‌صورت native با متد GET ارسال می‌کند؛ یعنی صفحه
 *      بارگذاری مجدد می‌شود و فرم هم به حالت اول برمی‌گردد.
 *
 * روی گوشی‌های قدیمی‌تر یا اینترنت کند (مثلاً iPhone X یا اندرویدهای
 * میان‌رده) فاصلهٔ «رندر شدن HTML» تا «هیدریشن» چند ثانیه است؛ بنابراین
 * همین دو اتفاق پرتکرار می‌شود و کاربر داستان «شماره را می‌زنم، دکمه را که
 * می‌زنم شماره پاک می‌شود و هیچ اتفاقی نمی‌افتد» را می‌بیند.
 *
 * راه‌حل: تا وقتی این hook مقدار `false` می‌دهد، فرم را با `inert` قفل
 * می‌کنیم (`FormProvider` + prop `lockUntilHydrated`) تا نه تایپ ممکن باشد و
 * نه submit native رخ بدهد. بعد از هیدریشن، فرم به‌طور عادی آزاد می‌شود.
 *
 * چرا `useSyncExternalStore` و نه `useState` + `useEffect`؟
 *   • روی سرور `getServerSnapshot` مقدار `false` می‌دهد و اولین رندر کلاینت هم
 *     همان `false` است، پس HTML سرور و کلاینت یکسان‌اند و hydration mismatch
 *     رخ نمی‌دهد (اگر از `useState(false)` + `useEffect` استفاده می‌کردیم،
 *     درست کار می‌کرد ولی قانون lint مربوط به setState داخل effect را
 *     نقض می‌کرد).
 *   • React بعد از هیدریشن خودش با snapshot کلاینت (`true`) یک رندر دوباره
 *     انجام می‌دهد؛ نیازی به تایمر یا رخداد نیست.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
}
