import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ZohalService } from './zohal.service';

describe('ZohalService', () => {
  let service: ZohalService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ZOHAL_API_KEY') return '';
        if (key === 'ZOHAL_BASE_URL') return 'https://service.zohal.io/api/v0';
        return '';
      }),
    } as any;

    process.env.ZOHAL_MOCK = 'true';
    service = new ZohalService(configService);
  });

  describe('Validation & Normalization', () => {
    it('normalizes and validates IBAN correctly', () => {
      expect(
        service.normalizeIban(' ir-123456789012345678901234 '),
      ).toBe('IR123456789012345678901234');
      expect(
        service.isValidIban('IR123456789012345678901234'),
      ).toBe(true);
      expect(service.isValidIban('123456789012345678901234')).toBe(false);
      expect(service.isValidIban('IR12345')).toBe(false);
    });

    it('normalizes and validates 16-digit card number', () => {
      expect(
        service.normalizeCardNumber(' ۶۰۳۷-۹۹۱۸-۱۲۳۴-۵۶۷۸ '),
      ).toBe('6037991812345678');
      expect(service.isValidCardNumber('6037991812345678')).toBe(true);
      expect(service.isValidCardNumber('603799181234567')).toBe(false);
      expect(service.isValidCardNumber('60379918123456789')).toBe(false);
    });

    it('normalizes Persian phone numbers', () => {
      expect(service.normalizePhone('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
      expect(service.normalizePhone('+989123456789')).toBe('09123456789');
      expect(service.normalizePhone('989123456789')).toBe('09123456789');
      expect(service.normalizePhone('9123456789')).toBe('09123456789');
    });

    it('matches Persian names with variations, prefixes and tokens', () => {
      expect(
        service.isNameMatched('علی رضایی', 'علی رضایی'),
      ).toBe(true);
      expect(
        service.isNameMatched('سید علی رضایی', 'علی رضایی'),
      ).toBe(true);
      expect(
        service.isNameMatched('محمد مهدی صادقی', 'محمدمهدی صادقی'),
      ).toBe(true);
      expect(
        service.isNameMatched('کامران احمدی', 'سارا حسینی'),
      ).toBe(false);
    });
  });

  describe('Mock Mode Operations', () => {
    it('verifies Shahkar in mock mode with valid national code', async () => {
      const result = await service.verifyShahkar({
        phone: '09120000000',
        nationalCode: '0010321268',
      });
      expect(result.matched).toBe(true);
    });

    it('rejects Shahkar with invalid national code format', async () => {
      await expect(
        service.verifyShahkar({
          phone: '09120000000',
          nationalCode: '1111111111',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifies comprehensive ownership in mock mode', async () => {
      const result = await service.verifyCardAndIbanOwnership({
        card: '6037991812345678',
        iban: 'IR123456789012345678901234',
        nationalCode: '0010321268',
        userFullName: 'علیرضا مشایخی',
        userPhone: '09120000000',
      });

      expect(result.cardNumber).toBe('6037991812345678');
      expect(result.iban).toBe('IR123456789012345678901234');
      expect(result.nationalCode).toBe('0010321268');
      expect(result.name).toBe('علیرضا مشایخی');
    });

    it('rejects ownership if card number is not 16 digits', async () => {
      await expect(
        service.verifyCardAndIbanOwnership({
          card: '1234',
          iban: 'IR123456789012345678901234',
          nationalCode: '0010321268',
          userFullName: 'علیرضا مشایخی',
          userPhone: '09120000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects ownership if IBAN is invalid', async () => {
      await expect(
        service.verifyCardAndIbanOwnership({
          card: '6037991812345678',
          iban: '1234',
          nationalCode: '0010321268',
          userFullName: 'علیرضا مشایخی',
          userPhone: '09120000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
