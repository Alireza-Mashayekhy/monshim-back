// src/common/services/sms-ir.service.ts
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { SMS_PARAM_MAX_LENGTH } from 'src/common/constants/constants';

interface VerifyParameter {
  name: string;
  value: string;
}

/** ساختار پاسخ سرویس SMS.ir (در پاسخ خطا هم همین شکل برمی‌گردد) */
interface SmsIrResponseBody {
  status?: number;
  message?: string;
  data?: { messageId: number; cost: number };
}

/** سقف زمان انتظار پاسخ SMS.ir تا درخواست هیچ‌وقت معلق نماند */
const SMS_REQUEST_TIMEOUT_MS = 15_000;

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

    const normalized = this.normalizeParameters(parameters);

    this.assertParameterLimits(templateId, normalized);

    const payload = {
      mobile,
      templateId: templateId,
      parameters: normalized,
    };

    let response: { data?: SmsIrResponseBody };

    try {
      response = await axios.post(this.verifyUrl, payload, {
        timeout: SMS_REQUEST_TIMEOUT_MS,
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
        const httpStatus = error.response?.status;
        const body = error.response?.data as SmsIrResponseBody | undefined;
        const hint =
          body?.status === 114
            ? ` — طول مقدار پارامتر از ${SMS_PARAM_MAX_LENGTH} کاراکتر بیشتر است`
            : '';

        // جزئیات خطای سرویس پیامک فقط در لاگ سرور ثبت می‌شود
        this.logger.error(
          `sms.ir request failed (http=${httpStatus ?? 'no-response'}, status=${
            body?.status ?? '-'
          }): ${body?.message ?? error.message}${hint}`,
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
        `sms.ir rejected the request (status=${
          response.data?.status ?? '-'
        }): ${response.data?.message ?? 'unknown error'}`,
      );
      throw new BadGatewayException(
        'ارسال پیامک با خطا مواجه شد. لطفاً بعداً تلاش کنید',
      );
    }

    const { messageId, cost } = response.data.data;

    return { messageId, cost };
  }

  /** یکسان‌سازی مقادیر پارامترها: حذف فاصله‌های اضافی و تبدیل به رشته */
  private normalizeParameters(
    parameters: VerifyParameter[],
  ): VerifyParameter[] {
    return (parameters ?? []).map(parameter => ({
      name: String(parameter?.name ?? '').trim(),
      value: String(parameter?.value ?? '').trim(),
    }));
  }

  /**
   * SMS.ir برای مقدار هر پارامتر قالب سقف ۲۵ کاراکتر دارد و در صورت عبور
   * از آن، درخواست را با HTTP 400 (کد وضعیت 114) رد می‌کند.
   * پیش از ارسال بررسی می‌کنیم تا خطا با پیام روشن و قابل ردیابی ثبت شود.
   */
  private assertParameterLimits(
    templateId: number,
    parameters: VerifyParameter[],
  ): void {
    const tooLong = parameters.filter(
      parameter => parameter.value.length > SMS_PARAM_MAX_LENGTH,
    );

    if (!tooLong.length) return;

    const detail = tooLong
      .map(parameter => `${parameter.name}=${parameter.value.length}`)
      .join(', ');

    this.logger.error(
      `قالب ${templateId}: طول مقدار پارامترها از سقف ${SMS_PARAM_MAX_LENGTH} کاراکتر SMS.ir بیشتر است (${detail})`,
    );

    throw new BadRequestException(
      'طول یکی از مقادیر قالب پیامک بیش از حد مجاز سرویس پیامک است',
    );
  }
}
