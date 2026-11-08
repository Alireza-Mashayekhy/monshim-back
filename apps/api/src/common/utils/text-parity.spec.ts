import { normalizeNumericString, toEnglishDigits } from './digits.util';
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
  toPersianDigits,
} from './national-code.util';
import { readSharedJson } from './repo-root.util';

/**
 * «قفل همسانی» منطق متن فارسی — سمت بک‌اند.
 *
 * همین بردارها در `front/lib/text-parity.test.ts` هم اجرا می‌شوند.
 * جزئیات در همان فایل توضیح داده شده است.
 */
type TextVectors = {
  vectors: {
    digits: {
      input: string;
      expect: { toEnglish: string; normalizeNumeric: string };
    }[];
    nationalCode: {
      input: string | number | null;
      expect: { normalize: string; isValid: boolean };
    }[];
    persian: { input: string; expect: string }[];
  };
};

/**
 * `jest` با `rootDir: "src"` اجرا می‌شود، پس `__dirname` این‌جا
 * `back/src/common/utils` است. سه پله بالا = `back/`، یک پله دیگر = ریشهٔ مخزن.
 */
const { vectors } = readSharedJson<TextVectors>('text-vectors.json');

describe('قفل همسانی منطق متن — بردارهای مشترک با فرانت', () => {
  it('فایل بردارها کامل است', () => {
    expect(vectors.digits.length).toBeGreaterThanOrEqual(20);
    expect(vectors.nationalCode.length).toBeGreaterThanOrEqual(40);
  });

  it('تبدیل ارقام فارسی/عربی دقیقاً منطبق است', () => {
    for (const vector of vectors.digits) {
      expect({
        label: vector.input,
        toEnglish: toEnglishDigits(vector.input),
        normalizeNumeric: normalizeNumericString(vector.input),
      }).toEqual({ label: vector.input, ...vector.expect });
    }
  });

  it('اعتبارسنجی و نرمال‌سازی کد ملی دقیقاً منطبق است', () => {
    for (const vector of vectors.nationalCode) {
      expect({
        label: String(vector.input),
        normalize: normalizeNationalCode(vector.input),
        isValid: isValidIranianNationalCode(vector.input),
      }).toEqual({ label: String(vector.input), ...vector.expect });
    }
  });

  it('تبدیل ارقام لاتین به فارسی دقیقاً منطبق است', () => {
    for (const vector of vectors.persian) {
      expect({
        label: vector.input,
        out: toPersianDigits(vector.input),
      }).toEqual({
        label: vector.input,
        out: vector.expect,
      });
    }
  });
});
