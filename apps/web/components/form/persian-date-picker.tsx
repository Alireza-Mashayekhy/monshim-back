// components/form/persian-date-picker.tsx
'use client';

import { CalendarIcon } from 'lucide-react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useFormContext, useWatch } from 'react-hook-form';
import DatePicker, { DateObject } from 'react-multi-date-picker';

import { FieldError } from '@/components/ui/field';
import { useHydrated } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';

export interface PersianDatePickerProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  portalTarget?: HTMLElement | null;
  /**
   * تقویم را در `document.body` رندر می‌کند (به‌جای داخل خودِ فرم).
   *
   * چرا؟ تقویم با `position: absolute` کنار فیلد باز می‌شود؛ اگر یکی از
   * والدین `overflow` داشته باشد (مثلاً `overflow-x-hidden` در قالب صفحات
   * ورود/ثبت‌نام) یا transform/blur داشته باشد، تقویم بریده یا پشت عناصر
   * دیگر پنهان می‌شود — روی نمایشگرهای باریک موبایل شایع‌تر است و کاربر
   * حس می‌کند «تاریخ باز نمی‌شود».
   */
  portal?: boolean;
  disablePastDates?: boolean;
}

export function PersianDatePicker({
  name,
  label,
  placeholder = 'انتخاب تاریخ',
  required = false,
  className,
  portalTarget,
  portal = false,
  disablePastDates = false,
}: PersianDatePickerProps) {
  const { setValue, control, formState } = useFormContext();
  const formValue = useWatch({ name, control });

  // `document` فقط بعد از هیدریشن در دسترس است؛ پیش از آن تقویم داخل فرم
  // رندر می‌شود تا HTML سرور و کلاینت یکسان بماند.
  const hydrated = useHydrated();
  const resolvedPortalTarget =
    portalTarget ?? (portal && hydrated ? document.body : null);

  const fieldError = formState.errors?.[name] as
    { message?: string } | undefined;

  /**
   * مقدار نمایش‌داده‌شده در فیلد.
   *
   * فرم تاریخ را به‌صورت شمسی «YYYY/MM/DD» نگه می‌دارد؛ تقویم همان را (با
   * ارقام فارسی) نشان می‌دهد. قبلاً همین مقدار در یک `useState` کپی و با
   * `useEffect` هم‌گام می‌شد که یک رندر آبشاری اضافه داشت؛ محاسبهٔ مستقیم
   * خروجی یکسان می‌دهد و چون رشته (primitive) است، تغییر هویت آن باعث
   * اجرای دوبارهٔ افکت‌های داخلی تقویم نمی‌شود.
   */
  const dateValue =
    typeof formValue === 'string' && formValue
      ? new DateObject({
          calendar: persian,
          locale: persian_fa,
          date: formValue,
        }).format()
      : null;

  const handleDateChange = (date: any) => {
    if (!date) {
      setValue(name, '', { shouldValidate: true });
      return;
    }
    // تبدیل به فرمت YYYY/MM/DD
    const year = date.year;
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    // `shouldValidate` باعث می‌شود بعد از انتخاب تاریخ، پیام خطای
    // «انتخاب تاریخ تولد اجباری است» فوراً پاک شود.
    setValue(name, `${year}/${month}/${day}`, { shouldValidate: true });
  };

  return (
    <div className={cn('space-y-2 w-full persian-date-picker', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        minDate={
          disablePastDates
            ? new DateObject({ calendar: persian, locale: persian_fa })
            : undefined
        }
        /**
         * ⚠️ `onOpenPickNewDate` پیش‌فرض `true` است؛ یعنی به‌محض باز شدن تقویم
         * (حتی بدون انتخاب هیچ روزی) تاریخ امروز در فرم نوشته می‌شد. نتیجه:
         *   • فیلد «تاریخ تولد» بلافاصله تاریخ امروز را نشان می‌داد،
         *   • و اگر کاربر تقویم را می‌بست، همان تاریخ امروز به‌عنوان تاریخ
         *     تولد ثبت می‌شد (اعتبارسنجی هم چون مقدار خالی نبود عبور می‌کرد).
         */
        onOpenPickNewDate={false}
        calendarPosition="bottom-right"
        portal={!!resolvedPortalTarget}
        portalTarget={resolvedPortalTarget ?? undefined}
        onChange={handleDateChange}
        placeholder={placeholder}
        className="w-full"
        inputClass={cn(
          'w-full h-12 px-3 border border-input rounded-lg text-base md:text-sm text-right outline-none bg-transparent transition',
          'hover:border-gray-400',
        )}
        style={{ width: '100%' }}
        render={<CustomInput invalid={!!fieldError} />}
        value={dateValue}
      />
      {fieldError && <FieldError errors={[fieldError]} />}
    </div>
  );
}

// کامپوننت ورودی سفارشی (اختیاری)
function CustomInput({ value, placeholder, openCalendar, invalid }: any) {
  return (
    <button
      type="button"
      data-invalid={invalid ? 'true' : undefined}
      aria-haspopup="dialog"
      className={cn(
        // `text-base` روی موبایل: مرورگرهای موبایل به ورودی‌های زیر ۱۶px زوم
        // می‌کنند و همان زوم باعث جابه‌جایی چیدمان و از دست رفتن لمس بعدی
        // می‌شود. روی دسکتاپ (`md`) همان ۱۴px قبلی را داریم.
        'w-full h-12 border border-input px-2.5 py-1 text-base md:text-sm rounded-lg text-right outline-none bg-transparent transition hover:border-gray-400 flex items-center gap-2',
        invalid &&
          'border-destructive ring-3 ring-destructive/20 focus-visible:border-destructive',
      )}
      onClick={openCalendar}
    >
      <CalendarIcon className="w-4 h-4 mb-0.5 text-gray-400" />
      <span className={cn(value ? 'text-gray-900' : 'text-gray-400')}>
        {value || placeholder || 'انتخاب تاریخ'}
      </span>
    </button>
  );
}

PersianDatePicker.displayName = 'PersianDatePicker';
