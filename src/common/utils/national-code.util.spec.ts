import {
  getNationalCodeError,
  isValidIranianNationalCode,
  normalizeNationalCode,
} from './national-code.util';

describe('National Code Util', () => {
  describe('normalizeNationalCode', () => {
    it('normalizes Persian and Arabic digits', () => {
      expect(normalizeNationalCode('۰۰۱۰۳۲۱۲۶۸')).toBe('0010321268');
      expect(normalizeNationalCode('٠٠١٠٣٢١٢٦٨')).toBe('0010321268');
      expect(normalizeNationalCode(' 001-032-1268 ')).toBe('0010321268');
    });

    it('strips invisible characters that come with copy/paste from Persian text', () => {
      // نیم‌فاصله، علامت جهت‌دهی راست‌به‌چپ (RLM) و فاصلهٔ بدون شکست
      expect(normalizeNationalCode('\u200F۰۰۱۰۳۲۱۲۶۸')).toBe('0010321268');
      expect(normalizeNationalCode('0010321268\u200F')).toBe('0010321268');
      expect(normalizeNationalCode('001032\u200C12\u200D68')).toBe(
        '0010321268',
      );
      expect(normalizeNationalCode('0010321\u00a0268')).toBe('0010321268');
    });

    it('handles empty / null inputs', () => {
      expect(normalizeNationalCode(null)).toBe('');
      expect(normalizeNationalCode(undefined)).toBe('');
      expect(normalizeNationalCode('')).toBe('');
    });
  });

  describe('isValidIranianNationalCode', () => {
    it('validates correct Iranian national codes', () => {
      expect(isValidIranianNationalCode('0010321268')).toBe(true);
      expect(isValidIranianNationalCode('۰۰۱۰۳۲۱۲۶۸')).toBe(true);
      expect(isValidIranianNationalCode('0499370899')).toBe(true);
      expect(isValidIranianNationalCode('0084545941')).toBe(true);
    });

    it('rejects codes with all identical digits', () => {
      expect(isValidIranianNationalCode('0000000000')).toBe(false);
      expect(isValidIranianNationalCode('1111111111')).toBe(false);
      expect(isValidIranianNationalCode('2222222222')).toBe(false);
    });

    it('rejects codes with invalid lengths or non-digits', () => {
      expect(isValidIranianNationalCode('123456789')).toBe(false);
      expect(isValidIranianNationalCode('12345678901')).toBe(false);
      expect(isValidIranianNationalCode('123456789a')).toBe(false);
      expect(isValidIranianNationalCode('')).toBe(false);
      expect(isValidIranianNationalCode(null)).toBe(false);
    });

    it('accepts codes that only look invalid because of invisible characters', () => {
      expect(isValidIranianNationalCode('0010321268\u200F')).toBe(true);
      expect(isValidIranianNationalCode('\u200F۰۰۱۰۳۲۱۲۶۸')).toBe(true);
    });

    it('rejects codes with incorrect checksum', () => {
      expect(isValidIranianNationalCode('0010321269')).toBe(false);
      expect(isValidIranianNationalCode('1234567890')).toBe(false);
    });
  });

  describe('getNationalCodeError', () => {
    it('returns null for valid codes even with separators', () => {
      expect(getNationalCodeError('0010321268')).toBeNull();
      expect(getNationalCodeError('۰۰۱۰-۳۲۱-۲۶۸')).toBeNull();
      expect(getNationalCodeError('0010321268\u200F')).toBeNull();
    });

    it('reports a length problem only when the length is actually wrong', () => {
      const error = getNationalCodeError('0010321');
      expect(error).toContain('باید ۱۰ رقم باشد');
      expect(error).toContain('۷ رقم وارد شده است');
    });

    it('does not claim a length problem when the checksum is wrong', () => {
      const error = getNationalCodeError('0010321269');
      expect(error).toContain('معتبر نیست');
      expect(error).not.toContain('۱۰ رقم');
    });

    it('requires a value and rejects non-digit characters', () => {
      expect(getNationalCodeError('')).toBe('کد ملی الزامی است');
      expect(getNationalCodeError(null)).toBe('کد ملی الزامی است');
      expect(getNationalCodeError('00103212a8')).toBe(
        'کد ملی فقط باید شامل رقم باشد',
      );
    });
  });
});
