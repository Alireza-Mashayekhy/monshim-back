'use client';

import { CalendarIcon, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { PersianDatePickerProps } from './persian-date-picker';

type PickerComponent = React.ComponentType<PersianDatePickerProps>;

let loadedComponent: PickerComponent | null = null;
let loadPromise: Promise<PickerComponent> | null = null;

/**
 * چانک تقویم را (یک بار برای همیشه) لود می‌کند.
 *
 * در صورت خطا، promise پاک می‌شود تا تلاش بعدی دوباره شانس داشته باشد؛ بدون
 * این کار یک خطای گذرای شبکه، تقویم را تا رفرش صفحه از کار می‌انداخت و
 * کاربر فقط یک کادر خالی و بی‌واکنش می‌دید.
 */
function loadPersianDatePicker(): Promise<PickerComponent> {
  if (!loadPromise) {
    loadPromise = import('./persian-date-picker')
      .then(module => {
        loadedComponent = module.PersianDatePicker;
        return module.PersianDatePicker;
      })
      .catch(error => {
        loadPromise = null;
        throw error;
      });
  }

  return loadPromise;
}

function PickerLabel({
  label,
  required,
}: {
  label?: string;
  required?: boolean;
}) {
  if (!label) return null;

  return (
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

/**
 * نسخهٔ lazy از `PersianDatePicker`.
 *
 * بستهٔ `react-multi-date-picker` ~۷۸K به چانک صفحاتی که از آن استفاده
 * می‌کنند اضافه می‌کند (مثل /register)، پس به‌صورت chunk جدا و بعد از mount
 * لود می‌شود.
 *
 * ⚠️ قبلاً با `next/dynamic` ساخته می‌شد و حالت «در حال لود» یک کادر خاکستریِ
 * بی‌واکنش (`animate-pulse`) بود؛ اگر چانک دیر می‌رسید یا خطا می‌داد، کاربر
 * روی «تاریخ تولد» می‌زد و **هیچ اتفاقی نمی‌افتاد** — دقیقاً شکایت رایج
 * «تاریخ تولد باز نمی‌شود» روی اینترنت کند/گوشی‌های قدیمی‌تر. حالا:
 *   • تا رسیدن چانک، یک فیلد با متن «در حال بارگذاری تقویم…» دیده می‌شود
 *     (کاربر می‌فهمد در حال آماده‌سازی است، نه خراب)،
 *   • و اگر لود شکست بخورد، پیام + دکمهٔ «تلاش مجدد» نمایش داده می‌شود
 *     (به‌جای یک کادر مرده که تا رفرش صفحه درست نمی‌شود).
 */
export function PersianDatePickerLazy(props: PersianDatePickerProps) {
  const [Component, setComponent] = useState<PickerComponent | null>(() => {
    return loadedComponent;
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (Component) return;

    let active = true;

    loadPersianDatePicker()
      .then(loaded => {
        if (!active) return;
        // تابع را داخل updater می‌دهیم تا React آن را به‌عنوان updater اجرا
        // نکند (کامپوننت، خودش یک تابع است).
        setComponent(() => loaded);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [Component, attempt]);

  if (Component) return <Component {...props} />;

  if (failed) {
    return (
      <div className="space-y-2 w-full">
        <PickerLabel label={props.label} required={props.required} />

        <div
          role="alert"
          className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700"
        >
          <span>بارگذاری تقویم انجام نشد.</span>

          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt(current => current + 1);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-800 underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <PickerLabel label={props.label} required={props.required} />

      <div
        role="status"
        aria-live="polite"
        className="flex h-12 w-full items-center gap-2 rounded-lg border border-input bg-gray-50/60 px-2.5 text-base md:text-sm text-gray-400"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <CalendarIcon className="w-4 h-4" />
        <span>در حال بارگذاری تقویم…</span>
      </div>
    </div>
  );
}
