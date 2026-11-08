import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readSharedJson } from '../tests/shared-vectors.mjs';
import { stripNumericSeparators, toEnglishDigits } from './digits.ts';
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
  toPersianDigits,
} from './national-code.ts';
import { toPersianDigits as toPersianDigitsFromUtils } from './utils.ts';

/**
 * «قفل همسانی» منطق متن فارسی — سمت فرانت.
 *
 * همین بردارها در `back/src/common/utils/text-parity.spec.ts` هم اجرا می‌شوند.
 *
 * چرا اهمیت دارد: اگر فرم فرانت کد ملی‌ای را «معتبر» بداند که سرور رد می‌کند
 * (یا برعکس)، کاربر پیام خطای متناقض می‌بیند. همین برای ارقام فارسی.
 */
type TextVectors = {
  vectors: {
    digits: { input: string; expect: { toEnglish: string; normalizeNumeric: string } }[];
    nationalCode: {
      input: string | number | null;
      expect: { normalize: string; isValid: boolean };
    }[];
    persian: { input: string; expect: string }[];
  };
};

const { vectors } = readSharedJson('text-vectors.json') as TextVectors;

describe('قفل همسانی منطق متن — همان بردارهای بک‌اند', () => {
  it('فایل بردارها کامل است', () => {
    assert.ok(vectors.digits.length >= 20);
    assert.ok(vectors.nationalCode.length >= 40);
  });

  it('تبدیل ارقام فارسی/عربی دقیقاً منطبق است', () => {
    for (const v of vectors.digits) {
      assert.equal(toEnglishDigits(v.input), v.expect.toEnglish, `toEnglish('${v.input}')`);
      assert.equal(
        stripNumericSeparators(v.input),
        v.expect.normalizeNumeric,
        `normalizeNumeric('${v.input}')`,
      );
    }
  });

  it('اعتبارسنجی و نرمال‌سازی کد ملی دقیقاً منطبق است', () => {
    for (const v of vectors.nationalCode) {
      assert.equal(
        normalizeNationalCode(v.input),
        v.expect.normalize,
        `normalize('${v.input}')`,
      );
      assert.equal(
        isValidIranianNationalCode(v.input),
        v.expect.isValid,
        `isValid('${v.input}')`,
      );
    }
  });

  it('تبدیل ارقام لاتین به فارسی دقیقاً منطبق است', () => {
    for (const v of vectors.persian) {
      assert.equal(toPersianDigits(v.input), v.expect, `toPersian('${v.input}')`);
    }
  });

  it('دو نسخهٔ toPersianDigits فرانت یکسان رفتار می‌کنند (یکی به دومی واگذار شده)', () => {
    for (const v of vectors.persian) {
      assert.equal(
        toPersianDigits(v.input),
        toPersianDigitsFromUtils(v.input),
        `utils/lib parity for '${v.input}'`,
      );
    }
  });
});
