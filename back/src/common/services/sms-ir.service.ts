// src/common/services/sms-ir.service.ts
import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface VerifyParameter {
  name: string;
  value: string;
}

@Injectable()
export class SmsIrService {
  private readonly logger = new Logger(SmsIrService.name);

  private readonly apiKey: string;
  private readonly verifyUrl: string;
  private readonly templateId: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SMS_IR_API_KEY', '');
    this.verifyUrl = this.configService.get<string>(
      'SMS_IR_VERIFY_URL',
      'https://api.sms.ir/v1/send/verify',
    );
    this.templateId = this.configService.get<number>('SMS_IR_TEMPLATE_ID', 0);
  }

  /**
   * ارسال پیامک verification با استفاده از قالب
   * @param mobile شماره موبایل گیرنده
   * @param parameters آرایه‌ای از پارامترهای قالب (مثلاً [{ name: 'OTP', value: '1234' }])
   */
  async sendVerify(
    mobile: string,
    parameters: VerifyParameter[],
  ): Promise<{ messageId: number; cost: number }> {
    if (!this.templateId) {
      throw new InternalServerErrorException(
        'قالب پیامک (TemplateId) در سرور تنظیم نشده است',
      );
    }

    const result = await this.sendTemplate(mobile, this.templateId, parameters);

    if (!result) {
      throw new InternalServerErrorException(
        'سرویس پیامک در سرور تنظیم نشده است',
      );
    }

    return result;
  }

  /**
   * ارسال پیامک با قالب دلخواه (برای پیامک‌های نوبت، یادآوری و ...)
   * اگر API Key تنظیم نشده باشد (محیط توسعه) هیچ درخواستی ارسال نمی‌شود.
   */
  async sendTemplate(
    mobile: string,
    templateId: number,
    parameters: VerifyParameter[],
  ): Promise<{ messageId: number; cost: number } | null> {
    if (!this.apiKey) {
      this.logger.warn(
        `SMS_IR_API_KEY تنظیم نشده است؛ پیامک قالب ${templateId} به ${mobile} ارسال نشد`,
      );

      return null;
    }

    if (!templateId) {
      this.logger.warn(
        `کد قالب ${templateId} معتبر نیست؛ پیامک به ${mobile} ارسال نشد`,
      );

      return null;
    }

    const payload = {
      mobile,
      templateId: this.templateId,
      parameters,
    };

    let response: {
      data?: {
        status?: number;
        message?: string;
        data?: { messageId: number; cost: number };
      };
    };

    try {
      response = await axios.post(this.verifyUrl, payload, {
        headers: {
          'X-API-KEY': this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof AxiosError) {
        const status = error.response?.status;
        // جزئیات خطای سرویس پیامک فقط در لاگ سرور ثبت میشود
        this.logger.error(
          `sms.ir request failed (status=${status ?? 'no-response'}): ${
            error.message
          }`,
        );
        throw new BadGatewayException(
          'ارتباط با سرویس پیامک برقرار نشد. لطفاً بعداً تلاش کنید',
        );
      }
      this.logger.error(`unexpected sms error: ${String(error)}`);
      throw new InternalServerErrorException(
        'خطای ناشناخته در ارسال پیامک رخ داد',
      );
    }

    if (response.data?.status !== 1 || !response.data.data) {
      this.logger.error(
        `sms.ir rejected the request: ${
          response.data?.message ?? 'unknown error'
        }`,
      );
      throw new BadGatewayException(
        'ارسال پیامک با خطا مواجه شد. لطفاً بعداً تلاش کنید',
      );
    }

    const { messageId, cost } = response.data.data;
    return { messageId, cost };
  }
}
