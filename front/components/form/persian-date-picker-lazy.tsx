'use client';

import dynamic from 'next/dynamic';

/**
 * نسخهٔ lazy از `PersianDatePicker`.
 *
 * بستهٔ `react-multi-date-picker` ~۷۸K به چانک صفحاتی که از آن استفاده
 * می‌کنند اضافه می‌کند (مثل /register). بارگذاری این کامپوننت تنها پس از
 * mount (زمانی که کاربر واقعاً وارد مرحلهٔ تاریخ تولد شده) این هزینه را
 * به تعویق می‌اندازد؛ در نتیجهٔ آن، TTI و LCP صفحهٔ /register بهبود می‌یابد.
 */
export const PersianDatePickerLazy = dynamic(
  () => import('./persian-date-picker').then(mod => mod.PersianDatePicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-12 w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
    ),
  },
);
