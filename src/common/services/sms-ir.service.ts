// src/common/services/sms-ir.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface VerifyParameter {
  name: string;
  value: string;
}

@Injectable()
export class SmsIrService {
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
   * @param parameters آرایه‌ای از پارامترهای قالب (مثلاً [{ name: 'Code', value: '12345' }])
   */
  async sendVerify(
    mobile: string,
    parameters: VerifyParameter[],
  ): Promise<{ messageId: number; cost: number }> {
    if (!this.templateId) {
      throw new HttpException(
        'قالب پیامک (TemplateId) در محیط تنظیم نشده است',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload = {
      mobile,
      templateId: this.templateId,
      parameters,
    };

    try {
      const response = await axios.post(this.verifyUrl, payload, {
        headers: {
          'X-API-KEY': this.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      // بر اساس مدل بازگشتی sms.ir
      if (response.data.status !== 1) {
        throw new HttpException(
          response.data.message || 'خطا در ارسال پیامک verification',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { messageId, cost } = response.data.data;
      return { messageId, cost };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status =
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error.response?.data?.message || 'خطا در ارتباط با سرویس پیامک';
        throw new HttpException(message, status);
      }
      throw new HttpException(
        'خطای ناشناخته در ارسال پیامک',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // متد قبلی (sendSms) را هم می‌توانید نگه دارید یا حذف کنید
}
