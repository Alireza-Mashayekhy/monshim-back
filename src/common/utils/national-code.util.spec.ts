import {
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

    it('rejects codes with incorrect checksum', () => {
      expect(isValidIranianNationalCode('0010321269')).toBe(false);
      expect(isValidIranianNationalCode('1234567890')).toBe(false);
    });
  });
});
