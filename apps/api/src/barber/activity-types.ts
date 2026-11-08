// src/barber/activity-types.ts

/**
 * مقادیر مجاز «نوع فعالیت» سالن.
 *
 * این همان گزینه‌هایی است که آرایشگر در ثبت‌نام انتخاب می‌کند و بعداً هم
 * می‌تواند در ویرایش پروفایل آن را تغییر دهد؛ بنابراین هر دو مسیر (auth و
 * barber) از همین فهرست استفاده می‌کنند تا مقادیر از هم واگرا نشوند.
 *
 * نکته: این فهرست باید با `front/constants/activity-types.ts` یکی بماند.
 */
export const ACTIVITY_TYPE_VALUES = ['women', 'men', 'both'] as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPE_VALUES)[number];

export const ACTIVITY_TYPE_ERROR_MESSAGE = 'نوع فعالیت معتبر نیست';

/**
 * بررسی اینکه مقدار داده‌شده یکی از نوع‌های فعالیت مجاز است.
 * داده‌های قدیمی ممکن است برچسب فارسی (مثلاً «آرایشگاه مردانه») داشته باشند؛
 * آن‌ها معتبر شناخته نمی‌شوند و آرایشگر باید هنگام ویرایش یکی از سه مقدار
 * استاندارد را انتخاب کند.
 */
export function isActivityTypeValue(
  value: unknown,
): value is ActivityTypeValue {
  return (
    typeof value === 'string' &&
    (ACTIVITY_TYPE_VALUES as readonly string[]).includes(value)
  );
}
