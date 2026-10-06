import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

/**
 * اسکیمای فرم ورود با رمز عبور.
 *
 * این فایل جدا از کامپوننت نگه داشته شده تا resolver (zod) بتواند
 * به‌صورت پویا بعد از mount لود شود؛ این کار ~۳۱K gz از چانک بحرانی
 * صفحهٔ /login حذف می‌کند.
 */
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
