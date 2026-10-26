import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { ZohalService } from './zohal.service';

describe('ZohalService', () => {
  let service: ZohalService;
  let configService: ConfigService;
  const originalZohalMock = process.env.ZOHAL_MOCK;

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

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalZohalMock === undefined) {
      delete process.env.ZOHAL_MOCK;
    } else {
      process.env.ZOHAL_MOCK = originalZohalMock;
    }
  });

  describe('Validation & Normalization', () => {
    it('normalizes and validates IBAN correctly', () => {
      expect(service.normalizeIban(' ir-123456789012345678901234 ')).toBe(
        'IR123456789012345678901234',
      );
      expect(service.isValidIban('IR123456789012345678901234')).toBe(true);
      expect(service.isValidIban('123456789012345678901234')).toBe(false);
      expect(service.isValidIban('IR12345')).toBe(false);
    });

    it('normalizes ZOHAL_BASE_URL even if misconfigured with endpoint path or bare host', () => {
      expect(service.normalizeBaseUrl('https://service.zohal.io/api/v0/')).toBe(
        'https://service.zohal.io/api/v0',
      );
      expect(
        service.normalizeBaseUrl(
          'https://service.zohal.io/api/v0/services/inquiry/iban',
        ),
      ).toBe('https://service.zohal.io/api/v0');
      expect(service.normalizeBaseUrl('https://service.zohal.io')).toBe(
        'https://service.zohal.io/api/v0',
      );
    });

    it('normalizes and validates 16-digit card number', () => {
      expect(service.normalizeCardNumber(' ۶۰۳۷-۹۹۱۸-۱۲۳۴-۵۶۷۸ ')).toBe(
        '6037991812345678',
      );
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

    it('matches Persian names with variations, compound names, prefixes and tokens', () => {
      expect(service.isNameMatched('علی رضایی', 'علی رضایی')).toBe(true);
      expect(service.isNameMatched('سید علی رضایی', 'علی رضایی')).toBe(true);
      expect(service.isNameMatched('علیرضا مشایخی', 'علی رضا مشایخی')).toBe(
        true,
      );
      expect(service.isNameMatched('محمد مهدی صادقی', 'محمدمهدی صادقی')).toBe(
        true,
      );
      expect(service.isNameMatched('کامران احمدی', 'سارا حسینی')).toBe(false);
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

  describe('Live Production Mode (Zohal HTTP Integration)', () => {
    function buildLiveService() {
      process.env.ZOHAL_MOCK = 'false';
      const liveConfig = {
        get: jest.fn((key: string) => {
          if (key === 'ZOHAL_API_KEY') return 'live-zohal-token';
          if (key === 'ZOHAL_BASE_URL')
            return 'https://service.zohal.io/api/v0';
          return '';
        }),
      } as unknown as ConfigService;
      return new ZohalService(liveConfig);
    }

    function makeAxiosError(status: number, data?: unknown): Error {
      const err = new Error(
        `Request failed with status code ${status}`,
      ) as Error & {
        isAxiosError: boolean;
        response: { status: number; data: unknown };
      };
      err.isAxiosError = true;
      err.response = { status, data };
      return err;
    }

    it('succeeds for Saman card/IBAN when card_to_iban returns 404/403 (unactivated sub-service) instead of throwing 400 Request failed with status code 404', async () => {
      const liveService = buildLiveService();
      const postSpy = jest.spyOn(axios, 'post').mockImplementation(url => {
        if (url.endsWith('/services/inquiry/shahkar')) {
          return Promise.resolve({
            data: { response_body: { data: { matched: true } }, result: 1 },
          } as any);
        }
        if (url.endsWith('/services/inquiry/iban')) {
          return Promise.resolve({
            data: {
              response_body: {
                data: {
                  name: 'علیرضا مشایخی',
                  bank_name: 'بانک سامان',
                  is_transferable: true,
                },
              },
              result: 1,
            },
          } as any);
        }
        // شبیه‌سازی دقیق خطای ۴۰۴ وب‌سرویس کارت در زحل
        return Promise.reject(makeAxiosError(404));
      });

      const verified = await liveService.verifyCardAndIbanOwnership({
        card: '6219861942641811',
        iban: 'IR880560611828005582138801',
        nationalCode: '0521288622',
        userFullName: 'علیرضا مشایخی',
        userPhone: '09121234567',
      });

      expect(verified).toEqual({
        name: 'علیرضا مشایخی',
        bank_name: 'بانک سامان',
        iban: 'IR880560611828005582138801',
        cardNumber: '6219861942641811',
        nationalCode: '0521288622',
      });
      expect(postSpy).toHaveBeenCalledWith(
        'https://service.zohal.io/api/v0/services/inquiry/card_to_iban',
        { card_number: '6219861942641811' },
        expect.any(Object),
      );
    });

    it('rejects with 400 BadRequestException when card_to_iban is active and returns a different IBAN', async () => {
      const liveService = buildLiveService();
      jest.spyOn(axios, 'post').mockImplementation(url => {
        if (url.endsWith('/services/inquiry/shahkar')) {
          return Promise.resolve({
            data: { response_body: { data: { matched: true } } },
          } as any);
        }
        if (url.endsWith('/services/inquiry/iban')) {
          return Promise.resolve({
            data: {
              response_body: {
                data: { name: 'علیرضا مشایخی', bank_name: 'بانک سامان' },
              },
            },
          } as any);
        }
        if (url.endsWith('/services/inquiry/card_to_iban')) {
          return Promise.resolve({
            data: {
              response_body: {
                data: { IBAN: 'IR110120000000009999999999' },
              },
            },
          } as any);
        }
        return Promise.reject(makeAxiosError(404));
      });

      await expect(
        liveService.verifyCardAndIbanOwnership({
          card: '6219861942641811',
          iban: 'IR880560611828005582138801',
          nationalCode: '0521288622',
          userFullName: 'علیرضا مشایخی',
          userPhone: '09121234567',
        }),
      ).rejects.toThrow(
        'شماره کارت وارد شده با شماره شبای وارد شده مطابقت ندارد',
      );
    });

    it('rejects when Shahkar explicitly reports matched=false, and skips gracefully when Shahkar token permission is inactive (403)', async () => {
      const liveService = buildLiveService();
      const postSpy = jest.spyOn(axios, 'post');

      // حالت اول: عدم تطابق واقعی شاهکار -> خطای ۴۰۰
      postSpy.mockResolvedValueOnce({
        data: { response_body: { data: { matched: false } } },
      });

      await expect(
        liveService.verifyCardAndIbanOwnership({
          card: '6219861942641811',
          iban: 'IR880560611828005582138801',
          nationalCode: '0521288622',
          userFullName: 'علیرضا مشایخی',
          userPhone: '09121234567',
        }),
      ).rejects.toThrow('شماره موبایل وارد شده با کد ملی مطابقت ندارد');

      // حالت دوم: عدم فعال بودن دسترسی شاهکار روی توکن (403) ولی فعال بودن استعلام شبا -> تایید از طریق شبا و نام
      postSpy.mockImplementation(url => {
        if (url.endsWith('/services/inquiry/shahkar')) {
          return Promise.reject(makeAxiosError(403));
        }
        if (url.endsWith('/services/inquiry/iban')) {
          return Promise.resolve({
            data: {
              response_body: {
                data: {
                  owners: [{ first_name: 'علیرضا', last_name: 'مشایخی' }],
                  bank_name: 'بانک سامان',
                },
              },
            },
          } as any);
        }
        return Promise.reject(makeAxiosError(403));
      });

      const verified = await liveService.verifyCardAndIbanOwnership({
        card: '6219861942641811',
        iban: 'IR880560611828005582138801',
        nationalCode: '0521288622',
        userFullName: 'علیرضا مشایخی',
        userPhone: '09121234567',
      });
      expect(verified.name).toBe('علیرضا مشایخی');
    });

    it('throws ServiceUnavailableException (never raw Axios 404 BadRequestException) if mandatory IBAN endpoint itself is unreachable', async () => {
      const liveService = buildLiveService();
      jest.spyOn(axios, 'post').mockRejectedValue(makeAxiosError(404));

      await expect(
        liveService.inquiryIban('IR880560611828005582138801'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
