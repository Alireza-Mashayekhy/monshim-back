import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

/**
 * اسکیمای فرم ثبت‌نام.
 *
 * این فایل جدا از کامپوننت نگه داشته شده تا zod (و resolver آن)
 * به‌صورت پویا بعد از mount لود شوند؛ این کار ~۱۰۸K raw / ~۳۱K gz
 * از چانک بحرانی صفحهٔ /register حذف می‌کند.
 */
export const registerSchema = z
  .object({
    gender: z.enum(['male', 'female'], {
      message: 'لطفاً جنسیت خود را انتخاب کنید.',
    }),
    firstName: z
      .string()
      .trim()
      .min(2, 'نام باید حداقل ۲ کاراکتر باشد.')
      .max(50, 'نام بسیار طولانی است.'),
    lastName: z
      .string()
      .trim()
      .min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد.')
      .max(50, 'نام خانوادگی بسیار طولانی است.'),
    phone: phoneSchema,
    provinceId: z.string().trim().nonempty('انتخاب استان اجباری است.'),
    cityId: z.string().trim().nonempty('انتخاب شهر اجباری است.'),
    birthDate: z.string().trim().min(1, 'انتخاب تاریخ تولد اجباری است.'),
    password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'),
    confirmPassword: z.string().min(1, 'تکرار رمز عبور اجباری است.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'تکرار رمز عبور با رمز عبور مطابقت ندارد.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
