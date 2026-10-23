/**
 * اعتبارسنجی و نرمال‌سازی کد ملی ایران در سمت کلاینت
 * طبق الگوریتم رسمی رقم کنترل سازمان ثبت‌احوال کشور
 */

export function normalizeNationalCode(
  input: string | number | null | undefined,
): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .trim()
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-]/g, '');
}

export function isValidIranianNationalCode(
  input: string | number | null | undefined,
): boolean {
  const clean = normalizeNationalCode(input);

  if (!/^\d{10}$/.test(clean)) {
    return false;
  }

  // ارقام یکسان نامعتبر هستند
  if (/^(\d)\1{9}$/.test(clean)) {
    return false;
  }

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  if (remainder < 2) {
    return check === remainder;
  }
  return check === 11 - remainder;
}
