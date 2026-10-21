import {
  BadGatewayException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { DEPOSIT_TOKEN_BYTES } from 'src/common/constants/constants';

const postMock = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');

  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      post: (...args: unknown[]) => postMock(...args),
    },
  };
});

import { SmsIrService } from './sms-ir.service';

const buildService = () => {
  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        SMS_IR_API_KEY: 'test-api-key',
        SMS_IR_VERIFY_URL: 'https://api.sms.ir/v1/send/verify',
        SMS_IR_TEMPLATE_ID: 100000,
      };

      return values[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;

  return new SmsIrService(configService);
};

const okResponse = (payload: unknown): AxiosResponse => ({
  data: payload,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
});

const errorResponse = (status: number, responseBody: unknown) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    {} as never,
    {},
    {
      data: responseBody,
      status,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    },
  );

describe('SmsIrService', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('پارامترها را حذف فاصله‌ی اضافی کرده و پاسخ موفق را برمی‌گرداند', async () => {
    postMock.mockResolvedValue(
      okResponse({
        status: 1,
        message: 'موفق',
        data: { messageId: 123, cost: 1 },
      }),
    );

    const result = await buildService().sendTemplate('09120000000', 100000, [
      { name: 'NAME', value: '  سارا  ' },
    ]);

    expect(result).toEqual({ messageId: 123, cost: 1 });
    expect(postMock).toHaveBeenCalledWith(
      'https://api.sms.ir/v1/send/verify',
      {
        mobile: '09120000000',
        templateId: 100000,
        parameters: [{ name: 'NAME', value: 'سارا' }],
      },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('ارسال توکن ۲۴ کاراکتری لینک بیعانه بدون خطا از سقف پارامتر عبور می‌کند', async () => {
    postMock.mockResolvedValue(
      okResponse({
        status: 1,
        message: 'موفق',
        data: { messageId: 1, cost: 1 },
      }),
    );

    await buildService().sendTemplate('09120000000', 196593, [
      { name: 'NAME', value: 'سارا' },
      { name: 'SALON_NAME', value: 'سالن رز' },
      { name: 'PAYMENT_LINK', value: 'a'.repeat(DEPOSIT_TOKEN_BYTES * 2) },
    ]);

    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('مقدار بلندتر از ۲۵ کاراکتر را پیش از درخواست رد می‌کند', async () => {
    await expect(
      buildService().sendTemplate('09120000000', 196593, [
        { name: 'PAYMENT_LINK', value: 'a'.repeat(48) },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(postMock).not.toHaveBeenCalled();
  });

  it('خطای 400 سرویس پیامک (کد 114) را با جزئیات لاگ و BadGateway برمی‌گرداند', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const service = buildService();

    postMock.mockRejectedValue(
      errorResponse(400, {
        status: 114,
        message: 'طول رشته مقدار پارامتر، بیش از حد مجاز (25 کاراکتر) می‌باشد',
      }),
    );

    await expect(
      service.sendTemplate('09120000000', 196593, [
        { name: 'SALON_NAME', value: 'سالن رز' },
      ]),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('status=114'),
    );
    loggerSpy.mockRestore();
  });

  it('اگر پاسخ موفق نباشد (status != 1) BadGateway می‌دهد', async () => {
    postMock.mockResolvedValue(
      okResponse({ status: 20, message: 'تعداد درخواست بیشتر از حد مجاز است' }),
    );

    await expect(
      buildService().sendTemplate('09120000000', 196593, [
        { name: 'SALON_NAME', value: 'سالن رز' },
      ]),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('بدون API Key هیچ درخواستی ارسال نمی‌کند', async () => {
    const configService = {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
    } as unknown as ConfigService;

    const result = await new SmsIrService(configService).sendTemplate(
      '09120000000',
      196593,
      [{ name: 'SALON_NAME', value: 'سالن رز' }],
    );

    expect(result).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });
});
