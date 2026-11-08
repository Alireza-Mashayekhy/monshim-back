// services/features/locations/hooks.ts
import { useQuery } from '@tanstack/react-query';

import { cityList, provinceList } from './api';

/**
 * بیشترین مقداری که می‌توان به `setTimeout` داد.
 *
 * ⚠️ باگ مهمی که اینجا رفع شد: مقدار قبلی `gcTime` معادل
 * `30 * 24 * 60 * 60 * 1000` = ۲٬۵۹۲٬۰۰۰٬۰۰۰ میلی‌ثانیه بود؛ یعنی بیشتر از
 * سقف ۳۲ بیتی علامت‌دار (۲٬۱۴۷٬۴۸۳٬۶۴۷). چنین مقداری در `setTimeout`
 * رفتار درستی ندارد:
 *   • در Node (رندر سمت سرور) با `TimeoutOverflowWarning` به **۱ میلی‌ثانیه**
 *     کلمپ می‌شود؛ یعنی تایمرِ جمع‌آوری زبالهٔ react-query فوراً اجرا می‌شود و
 *     کش استان/شهر بلافاصله پاک می‌گردد → در هر رندر/بازگشت به صفحه، دوباره
 *     از API گرفته می‌شود (درخواست و پردازش اضافه روی CPU).
 *   • در مرورگر هم تایمر خارج از بازه به ۰ کلمپ می‌شود و همان اتفاق می‌افتد.
 *
 * برای همین از یک مقدار معتبر (۲۴ روز) استفاده می‌کنیم: همان عمر طولانیِ مورد
 * نظر، ولی بدون سرریز عددی و بدون کلمپ‌شدن تایمر.
 */
const MAX_SAFE_TIMEOUT = 2_073_600_000; // ۲۴ روز، کمتر از سقف ۲۱۴۷۴۸۳۶۴۷

export const useProvinceList = () => {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: provinceList,
    staleTime: 24 * 60 * 60 * 1000, // ۱ روز
    gcTime: MAX_SAFE_TIMEOUT,
  });
};

export const useCityList = (provinceId: number | null) => {
  return useQuery({
    queryKey: ['cities', provinceId],
    queryFn: () => cityList(provinceId!),
    enabled: !!provinceId,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: MAX_SAFE_TIMEOUT,
  });
};

