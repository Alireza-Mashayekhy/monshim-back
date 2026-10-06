import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

/**
 * اسکیمای شمارهٔ تلفن برای ورود با OTP.
 *
 * این فایل جدا از کامپوننت نگه داشته شده تا zod (و resolver آن)
 * به‌صورت پویا بعد از mount لود شوند.
 */
export const phoneFormSchema = z.object({
  phone: phoneSchema,
});

export type PhoneFormValues = z.infer<typeof phoneFormSchema>;
