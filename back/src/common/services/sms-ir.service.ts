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
