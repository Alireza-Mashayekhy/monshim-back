import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface IbanInquiryData {
  name?: string;
  bank_name?: string;
  is_transferable?: boolean;
  [key: string]: any;
}

const ZOHAL_TIMEOUT_MS = 10000;
const ZOHAL_BASE_URL = 'https://service.zohal.io/api/v0';

@Injectable()
export class ZohalService {
  private readonly logger = new Logger(ZohalService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('ZOHAL_API_KEY') ||
      this.configService.get<string>('ZOHAL_TOKEN') ||
      this.configService.get<string>('ZOHAL_API_TOKEN') ||
      '';
    this.baseUrl =
      this.configService.get<string>('ZOHAL_BASE_URL') || ZOHAL_BASE_URL;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * استعلام شبا از زحل
   * POST https://service.zohal.io/api/v0/services/inquiry/iban
   * body: {iban: "IR...", separated: false}
   * headers: Authorization: Bearer <token>
   */
  async inquiryIban(iban: string): Promise<IbanInquiryData> {
    const normalizedIban = this.normalizeIban(iban);
    if (!this.isValidIban(normalizedIban)) {
      throw new BadRequestException('شماره شبا معتبر نیست. باید با IR شروع شود و ۲۶ کاراکتر باشد');
    }

    if (!this.apiKey) {
      this.logger.warn(
        'ZOHAL_API_KEY تنظیم نشده است؛ استعلام شبا بدون احراز هویت انجام می‌شود (حالت توسعه)',
      );
      // در حالت توسعه بدون کلید، امکان تست بدون تماس با سرویس خارجی:
      // اگر ZOHAL_MOCK=true باشد، پاسخ ساختگی برگردان
      if ((process.env.ZOHAL_MOCK ?? '').toLowerCase() === 'true' || process.env.NODE_ENV !== 'production') {
        this.logger.warn(`ZOHAL_MOCK فعال است؛ استعلام شبا ${normalizedIban} بدون تماس خارجی تایید شد (نام صاحب حساب چک نشد)`);
        return { name: '', bank_name: '' };
      }
      throw new ServiceUnavailableException(
        'سرویس استعلام شبا در حال حاضر تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید',
      );
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/iban`,
        {
          iban: normalizedIban,
          separated: false,
        },
        {
          timeout: ZOHAL_TIMEOUT_MS,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      const body = response.data;
      // زحل envelope: {response_body: {data: {...}, error_code, message}, result}
      const errorCode = body?.response_body?.error_code;
      if (errorCode) {
        const msg = body?.response_body?.message || errorCode;
        this.logger.warn(`Zohal iban inquiry business error ${errorCode}: ${msg} for ${normalizedIban}`);
        throw new BadRequestException(msg || 'استعلام شبا ناموفق بود');
      }

      const data: IbanInquiryData = body?.response_body?.data ?? body?.data ?? body;
      if (!data || typeof data !== 'object') {
        throw new BadRequestException('پاسخ استعلام شبا نامعتبر است');
      }
      return data;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      const status = error?.response?.status;
      const body = error?.response?.data;
      const msg = body?.response_body?.message || body?.message || error?.message;
      this.logger.error(`Zohal iban inquiry failed http=${status ?? 'no-response'} msg=${msg ?? String(error)} for ${normalizedIban}`);
      if (status === 401 || status === 403) {
        throw new ServiceUnavailableException('کلید سرویس استعلام شبا نامعتبر است');
      }
      throw new BadRequestException(msg || 'استعلام شبا با خطا مواجه شد');
    }
  }

  /**
   * بررسی هم‌نام بودن شبا با کاربر
   * - از زحل نام صاحب شبا را می‌گیرد
   * - با نام کامل کاربر مقایسه می‌کند (بعد از نرمال‌سازی فارسی)
   * - اگر ZOHAL_MOCK یا توسعه بدون کلید باشد، تایید می‌شود
   */
  async verifyIbanOwnership(params: {
    iban: string;
    userFullName: string;
    userPhone: string;
  }): Promise<IbanInquiryData> {
    const data = await this.inquiryIban(params.iban);

    // اگر در حالت mock هستیم و نامی برنگشته، تایید می‌کنیم
    if (!data.name) {
      if (!this.apiKey && process.env.NODE_ENV !== 'production') {
        return data;
      }
      // اگر سرویس نامی نداد ولی خطا هم نداد، اجازه می‌دهیم (ممکن است بانک نام را ندهد)
      this.logger.warn(`Zohal did not return owner name for ${this.normalizeIban(params.iban)}, skipping name check`);
      return data;
    }

    const ownerName = data.name as string;
    const userName = params.userFullName;

    // اگر نام کاربری خالی است، امکان مقایسه نیست؛ فقط لاگ و اجازه ثبت
    if (!String(userName ?? '').trim()) {
      this.logger.warn(`user ${params.userPhone} has no fullName; skipping IBAN name check for ${params.iban}`);
      return data;
    }

    if (!this.isNameMatched(ownerName, userName)) {
      this.logger.warn(
        `IBAN ownership mismatch: iban owner="${ownerName}" vs user="${userName}" phone=${params.userPhone}`,
      );
      throw new BadRequestException(
        `نام صاحب حساب شبا (${ownerName}) با نام کاربری شما (${userName}) مطابقت ندارد. لطفاً شماره شبای متعلق به خود را وارد کنید`,
      );
    }

    return data;
  }

  private normalizeIban(iban: string): string {
    return String(iban ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s\-]/g, '');
  }

  private isValidIban(iban: string): boolean {
    return /^IR\d{24}$/.test(iban);
  }

  /**
   * نرمال‌سازی نام فارسی برای مقایسه
   */
  private normalizeName(name: string): string {
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      // یکسان‌سازی ی و ک عربی/فارسی
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      // حذف نیم‌فاصله و تبدیل به فاصله
      .replace(/\u200c/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isNameMatched(ownerName: string, userName: string): boolean {
    const nOwner = this.normalizeName(ownerName);
    const nUser = this.normalizeName(userName);
    if (!nOwner || !nUser) return false;
    if (nOwner === nUser) return true;
    // چک زیررشته‌ای دوطرفه (برای حالتی که یکی نام کامل‌تر دارد)
    if (nOwner.includes(nUser) || nUser.includes(nOwner)) return true;
    // چک توکنی: حداقل 2 کلمه مشترک یا 50% اشتراک
    const ownerTokens = nOwner.split(' ').filter(Boolean);
    const userTokens = nUser.split(' ').filter(Boolean);
    const common = userTokens.filter(t => ownerTokens.includes(t));
    if (common.length >= 2) return true;
    if (userTokens.length > 0 && common.length / userTokens.length >= 0.5) return true;
    if (ownerTokens.length > 0 && common.length / ownerTokens.length >= 0.5) return true;
    return false;
  }
}
