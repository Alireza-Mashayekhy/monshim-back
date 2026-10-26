import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jalaliToIso } from './date-utils';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  stripNumericSeparators,
  toEnglishDigits,
} from './digits';
import { sanitizeNationalCodeInput } from './national-code';
import { normalizePhone } from './phone';
import {
  formatFaNumber,
  formatNumberInput,
  formatPrice,
  unformatNumberInput,
} from './utils';

describe('frontend Persian & Arabic digit support', () => {
  it('converts Persian and Arabic-Indic digits to English ASCII digits', () => {
    assert.equal(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
    assert.equal(toEnglishDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
    assert.equal(toEnglishDigits('۱۴۰۵/۰۸/۰۴'), '1405/08/04');
    assert.equal(toEnglishDigits(null), '');
    assert.equal(toEnglishDigits(undefined), '');
  });

  it('strips thousand separators and normalizes Persian decimal separator', () => {
    assert.equal(stripNumericSeparators('۲۵۰,۰۰۰'), '250000');
    assert.equal(stripNumericSeparators('۱٬۲۵۰،۰۰۰'), '1250000');
    assert.equal(stripNumericSeparators('۱۲٫۵'), '12.5');
    assert.equal(stripNumericSeparators('150000.00'), '150000.00');
  });

  it('sanitizes integer inputs containing Persian/Arabic digits and commas', () => {
    assert.equal(sanitizeIntegerInput('۲۵۰,۰۰۰ تومان'), '250000');
    assert.equal(sanitizeIntegerInput('١٥٠٬٠٠٠'), '150000');
    assert.equal(sanitizeIntegerInput('۰۹۱۲ ۳۴۵ ۶۷۸۹'), '09123456789');
    assert.equal(sanitizeIntegerInput('abc'), '');
  });

  it('sanitizes decimal inputs with Persian digits, Persian decimal marks, and precision cap', () => {
    assert.equal(sanitizeDecimalInput('۲۰٫۷۵۶', 2), '20.75');
    assert.equal(sanitizeDecimalInput('۱۲/', 2), '12.');
    assert.equal(sanitizeDecimalInput('.۵', 2), '0.5');
    assert.equal(sanitizeDecimalInput('۱۲.۳.۴', 2), '12.34');
  });

  it('handles Persian digits in utils number formatters/parsers and date/phone/national-code helpers', () => {
    assert.equal(unformatNumberInput('۲۵۰,۰۰۰'), 250000);
    assert.equal(unformatNumberInput('۱٬۵۰۰٬۰۰۰'), 1500000);
    assert.equal(formatPrice('۲۵۰,۰۰۰'), '250,000');
    assert.equal(formatPrice('150000.00'), '150,000');
    assert.equal(formatNumberInput('۲۵۰۰۰۰'), '250،000');
    assert.equal(formatFaNumber('۱۲۳۴'), '۱٬۲۳۴');
    assert.equal(jalaliToIso('۱۴۰۵/۰۸/۰۴'), '2026-10-26');
    assert.equal(normalizePhone('۰۹۱۲ ۳۴۵ ۶۷۸۹'), '09123456789');
    assert.equal(sanitizeNationalCodeInput('۰۰۱-۰۳۲-۱۲۶۸'), '0010321268');
  });
});
