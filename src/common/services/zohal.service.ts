import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import {
  isValidIranianNationalCode,
  normalizeNationalCode,
} from '../utils/national-code.util';

export interface IbanInquiryData {
  name?: string;
  bank_name?: string;
  deposit_number?: string;
  is_transferable?: boolean;
  [key: string]: any;
}

export interface CardInquiryData {
  iban?: string;
  name?: string;
  bank_name?: string;
  card_number?: string;
  deposit_number?: string;
  [key: string]: any;
}

export interface MatchResult {
  matched: boolean;
  [key: string]: any;
}

export interface VerifiedBankingOwnership {
  name: string;
  bank_name: string;
  iban: string;
  cardNumber: string;
  nationalCode: string;
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

  isMockActive(): boolean {
    return (
      (process.env.ZOHAL_MOCK ?? '').toLowerCase() === 'true' ||
      (!this.apiKey && process.env.NODE_ENV !== 'production')
    );
  }

  /**
   * استعلام شبا از زحل
   * POST /services/inquiry/iban
   * body: { iban: "IR...", separated: false }
   */
  async inquiryIban(iban: string): Promise<IbanInquiryData> {
    const normalizedIban = this.normalizeIban(iban);
    if (!this.isValidIban(normalizedIban)) {
      throw new BadRequestException(
        'شماره شبا معتبر نیست. باید با IR شروع شود و ۲۶ کاراکتر باشد',
      );
    }

    if (this.isMockActive()) {
      this.logger.warn(
        `ZOHAL_MOCK فعال است؛ استعلام شبا ${normalizedIban} بدون تماس خارجی شبیه‌سازی شد`,
      );
      return {
        name: '',
        bank_name: 'بانک پاسارگاد',
        is_transferable: true,
      };
    }

    if (!this.apiKey) {
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

      return this.extractResponseData<IbanInquiryData>(
        response.data,
        normalizedIban,
        'استعلام شبا',
      );
    } catch (error: any) {
      return this.handleAxiosError(error, normalizedIban, 'استعلام شبا');
    }
  }

  /**
   * استعلام کارت و تبدیل کارت به شبا از زحل
   * POST /services/inquiry/card/iban یا /services/inquiry/card
   * body: { card: "603799..." }
   */
  async inquiryCard(card: string): Promise<CardInquiryData> {
    const normalizedCard = this.normalizeCardNumber(card);
    if (!this.isValidCardNumber(normalizedCard)) {
      throw new BadRequestException('شماره کارت باید ۱۶ رقم باشد');
    }

    if (this.isMockActive()) {
      this.logger.warn(
        `ZOHAL_MOCK فعال است؛ استعلام کارت ${normalizedCard} بدون تماس خارجی شبیه‌سازی شد`,
      );
      return {
        iban: '',
        name: '',
        bank_name: 'بانک ملی',
        card_number: normalizedCard,
      };
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'سرویس استعلام کارت در حال حاضر تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید',
      );
    }

    // ابتدا اندپوینت تبدیل کارت به شبا را امتحان می‌کنیم
    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/card/iban`,
        {
          card: normalizedCard,
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

      return this.extractResponseData<CardInquiryData>(
        response.data,
        normalizedCard,
        'استعلام کارت به شبا',
      );
    } catch (primaryError: any) {
      // اگر اندپوینت card/iban با ۴۰۴ مواجه شد، اندپوینت پایه /services/inquiry/card را تست می‌کنیم
      if (primaryError?.response?.status === 404) {
        try {
          const fallbackResponse = await axios.post(
            `${this.baseUrl}/services/inquiry/card`,
            { card: normalizedCard },
            {
              timeout: ZOHAL_TIMEOUT_MS,
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          );
          return this.extractResponseData<CardInquiryData>(
            fallbackResponse.data,
            normalizedCard,
            'استعلام کارت',
          );
        } catch (fallbackError: any) {
          return this.handleAxiosError(
            fallbackError,
            normalizedCard,
            'استعلام کارت',
          );
        }
      }
      return this.handleAxiosError(
        primaryError,
        normalizedCard,
        'استعلام کارت',
      );
    }
  }

  /**
   * استعلام شاهکار: تطبیق شماره موبایل و کد ملی
   * POST /services/inquiry/shahkar
   * body: { mobile: "0912...", national_code: "..." }
   */
  async verifyShahkar(params: {
    phone: string;
    nationalCode: string;
  }): Promise<MatchResult> {
    const cleanNationalCode = normalizeNationalCode(params.nationalCode);
    const cleanPhone = this.normalizePhone(params.phone);

    if (!isValidIranianNationalCode(cleanNationalCode)) {
      throw new BadRequestException('کد ملی وارد شده معتبر نیست');
    }

    if (this.isMockActive()) {
      this.logger.warn(
        `ZOHAL_MOCK فعال است؛ تطبیق شاهکار برای شماره ${cleanPhone} و کد ملی ${cleanNationalCode} شبیه‌سازی شد`,
      );
      return { matched: true };
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'سرویس شاهکار در حال حاضر تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید',
      );
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/shahkar`,
        {
          mobile: cleanPhone,
          national_code: cleanNationalCode,
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

      const data = this.extractResponseData<MatchResult>(
        response.data,
        cleanPhone,
        'استعلام شاهکار',
      );

      const isMatched =
        data.matched === true ||
        (data as any).is_matched === true ||
        (data as any).match === true;

      if (!isMatched) {
        throw new BadRequestException(
          'شماره موبایل وارد شده با کد ملی مطابقت ندارد. سیم‌کارت باید به نام صاحب کد ملی باشد.',
        );
      }

      return data;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      return this.handleAxiosError(error, cleanPhone, 'استعلام شاهکار');
    }
  }

  /**
   * تطبیق شماره شبا با کد ملی
   * POST /services/inquiry/iban/match
   * body: { iban: "IR...", national_code: "..." }
   */
  async matchIbanWithNationalCode(params: {
    iban: string;
    nationalCode: string;
  }): Promise<MatchResult> {
    const cleanNationalCode = normalizeNationalCode(params.nationalCode);
    const cleanIban = this.normalizeIban(params.iban);

    if (!isValidIranianNationalCode(cleanNationalCode)) {
      throw new BadRequestException('کد ملی وارد شده معتبر نیست');
    }

    if (!this.isValidIban(cleanIban)) {
      throw new BadRequestException('شماره شبا معتبر نیست');
    }

    if (this.isMockActive()) {
      return { matched: true };
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'سرویس تطبیق شبا با کد ملی تنظیم نشده است',
      );
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/iban/match`,
        {
          iban: cleanIban,
          national_code: cleanNationalCode,
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

      const data = this.extractResponseData<MatchResult>(
        response.data,
        cleanIban,
        'تطبیق شبا با کد ملی',
      );

      const isMatched =
        data.matched === true ||
        (data as any).is_matched === true ||
        (data as any).match === true;

      if (!isMatched) {
        throw new BadRequestException('شماره شبا با کد ملی شما مطابقت ندارد');
      }

      return data;
    } catch (error: any) {
      // در صورتی که این سرویس در طرح زحل در دسترس نباشد (مثلاً ۴۰۴)، اجازه فالبک به تطابق نام می‌دهیم
      if (error?.response?.status === 404) {
        this.logger.warn(
          `Zohal iban match endpoint not found (404), falling back to name/shahkar matching`,
        );
        return { matched: true };
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      return this.handleAxiosError(
        error,
        cleanIban,
        'تطبیق شبا با کد ملی',
      );
    }
  }

  /**
   * اعتبارسنجی جامع مالکیت کارت بانکی و شبا با تطبیق شماره موبایل، کد ملی و نام کاربر
   * مطابق با الزامات شاپرک، شاهکار و بانک مرکزی در زحل:
   * ۱. بررسی معتبر بودن فرمت کد ملی طبق الگوریتم ثبت‌احوال
   * ۲. بررسی فرمت کارت (۱۶ رقم) و شبا (IR + ۲۴ رقم)
   * ۳. استعلام شاهکار (تطبیق مالکیت شماره موبایل با کد ملی)
   * ۴. استعلام شبا و کارت از زحل و بررسی هم‌خوانی شبا و کارت با یکدیگر
   * ۵. بررسی تطابق نام صاحب حساب با نام و نام خانوادگی کاربر در سیستم
   */
  async verifyCardAndIbanOwnership(params: {
    card: string;
    iban: string;
    nationalCode: string;
    userFullName: string;
    userPhone: string;
  }): Promise<VerifiedBankingOwnership> {
    const cleanNationalCode = normalizeNationalCode(params.nationalCode);
    const cleanCard = this.normalizeCardNumber(params.card);
    const cleanIban = this.normalizeIban(params.iban);

    // ۱. بررسی فرمت کد ملی
    if (!isValidIranianNationalCode(cleanNationalCode)) {
      throw new BadRequestException('کد ملی وارد شده معتبر نیست');
    }

    // ۲. بررسی فرمت کارت
    if (!this.isValidCardNumber(cleanCard)) {
      throw new BadRequestException('شماره کارت باید ۱۶ رقم باشد');
    }

    // ۳. بررسی فرمت شبا
    if (!this.isValidIban(cleanIban)) {
      throw new BadRequestException(
        'شماره شبا معتبر نیست. باید با IR شروع شود و ۲۶ کاراکتر باشد',
      );
    }

    // ۴. استعلام شاهکار (تطبیق شماره موبایل با کد ملی)
    await this.verifyShahkar({
      phone: params.userPhone,
      nationalCode: cleanNationalCode,
    });

    // در حالت ماک، شبیه‌سازی با موفقیت انجام می‌شود
    if (this.isMockActive()) {
      return {
        name: params.userFullName || 'صاحب حساب تایید شده',
        bank_name: 'بانک پاسارگاد',
        iban: cleanIban,
        cardNumber: cleanCard,
        nationalCode: cleanNationalCode,
      };
    }

    // ۵. استعلام شبا از زحل
    const ibanData = await this.inquiryIban(cleanIban);

    // ۶. استعلام کارت از زحل
    let cardData: CardInquiryData | null = null;
    try {
      cardData = await this.inquiryCard(cleanCard);
      // اگر اندپوینت کارت شبا را برگرداند، باید دقیقاً با شبای وارد شده مطابقت داشته باشد
      if (cardData?.iban) {
        const cardIban = this.normalizeIban(cardData.iban);
        if (cardIban && cardIban !== cleanIban) {
          throw new BadRequestException(
            'شماره کارت وارد شده با شماره شبای وارد شده مطابقت ندارد',
          );
        }
      }
    } catch (cardError: any) {
      if (cardError instanceof BadRequestException) {
        throw cardError;
      }
      this.logger.warn(
        `Zohal card inquiry warning: ${cardError?.message}. Continuing with IBAN verification.`,
      );
    }

    // ۷. بررسی تطابق مستقیم شبا با کد ملی
    try {
      await this.matchIbanWithNationalCode({
        iban: cleanIban,
        nationalCode: cleanNationalCode,
      });
    } catch (matchError: any) {
      if (matchError instanceof BadRequestException) {
        throw matchError;
      }
      this.logger.warn(
        `Zohal iban match check warning: ${matchError?.message}`,
      );
    }

    // ۸. تطبیق نام و نام خانوادگی صاحب حساب بانکی با نام کاربر
    const verifiedOwnerName =
      (ibanData.name as string) || (cardData?.name as string) || '';

    if (verifiedOwnerName && params.userFullName) {
      if (!this.isNameMatched(verifiedOwnerName, params.userFullName)) {
        this.logger.warn(
          `Bank ownership name mismatch: bank owner="${verifiedOwnerName}" vs user="${params.userFullName}" phone=${params.userPhone}`,
        );
        throw new BadRequestException(
          `نام صاحب حساب بانکی (${verifiedOwnerName}) با نام شما در سامانه (${params.userFullName}) مطابقت ندارد. شماره کارت و شبا باید متعلق به دارنده حساب کاربری باشد.`,
        );
      }
    }

    const bankName =
      (ibanData.bank_name as string) ||
      (cardData?.bank_name as string) ||
      'بانک';

    return {
      name: verifiedOwnerName || params.userFullName,
      bank_name: bankName,
      iban: cleanIban,
      cardNumber: cleanCard,
      nationalCode: cleanNationalCode,
    };
  }

  /**
   * بررسی سازگاری به عقب: بررسی هم‌نام بودن شبا با کاربر
   */
  async verifyIbanOwnership(params: {
    iban: string;
    userFullName: string;
    userPhone: string;
  }): Promise<IbanInquiryData> {
    const data = await this.inquiryIban(params.iban);

    if (!data.name) {
      if (!this.apiKey && process.env.NODE_ENV !== 'production') {
        return data;
      }
      this.logger.warn(
        `Zohal did not return owner name for ${this.normalizeIban(params.iban)}, skipping name check`,
      );
      return data;
    }

    const ownerName = data.name as string;
    const userName = params.userFullName;

    if (!String(userName ?? '').trim()) {
      this.logger.warn(
        `user ${params.userPhone} has no fullName; skipping IBAN name check for ${params.iban}`,
      );
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

  public normalizeIban(iban: string): string {
    return String(iban ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s\-]/g, '');
  }

  public isValidIban(iban: string): boolean {
    return /^IR\d{24}$/.test(iban);
  }

  public normalizeCardNumber(card: string): string {
    return String(card ?? '')
      .trim()
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[\s\-]/g, '');
  }

  public isValidCardNumber(card: string): boolean {
    const clean = this.normalizeCardNumber(card);
    return /^\d{16}$/.test(clean);
  }

  public normalizePhone(phone: string): string {
    let clean = String(phone ?? '')
      .trim()
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[\s\-+]/g, '');

    if (clean.startsWith('98')) {
      clean = '0' + clean.slice(2);
    } else if (!clean.startsWith('0') && clean.length === 10) {
      clean = '0' + clean;
    }
    return clean;
  }

  /**
   * نرمال‌سازی نام فارسی برای مقایسه
   */
  public normalizeName(name: string): string {
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      // یکسان‌سازی ی و ک عربی/فارسی
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      // حذف اعراب و تنوین
      .replace(/[\u064B-\u065F]/g, '')
      // حذف نیم‌فاصله و تبدیل به فاصله
      .replace(/\u200c/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public isNameMatched(ownerName: string, userName: string): boolean {
    const nOwner = this.normalizeName(ownerName);
    const nUser = this.normalizeName(userName);
    if (!nOwner || !nUser) return false;
    if (nOwner === nUser) return true;
    // چک زیررشته‌ای دوطرفه (برای حالتی که یکی پیشوند مثل سید یا پسوند دارد)
    if (nOwner.includes(nUser) || nUser.includes(nOwner)) return true;
    // چک توکنی: کلمات مشترک
    const ownerTokens = nOwner.split(' ').filter(Boolean);
    const userTokens = nUser.split(' ').filter(Boolean);
    const common = userTokens.filter(t => ownerTokens.includes(t));
    if (common.length >= 2) return true;
    if (userTokens.length > 0 && common.length / userTokens.length >= 0.5) {
      return true;
    }
    if (ownerTokens.length > 0 && common.length / ownerTokens.length >= 0.5) {
      return true;
    }
    return false;
  }

  private extractResponseData<T>(
    body: any,
    target: string,
    operationName: string,
  ): T {
    const errorCode = body?.response_body?.error_code ?? body?.error_code;
    if (errorCode) {
      const msg =
        body?.response_body?.message || body?.message || String(errorCode);
      this.logger.warn(
        `Zohal ${operationName} business error ${errorCode}: ${msg} for ${target}`,
      );
      throw new BadRequestException(msg || `${operationName} ناموفق بود`);
    }

    const data: T =
      body?.response_body?.data ?? body?.data ?? body?.response_body ?? body;
    if (!data || typeof data !== 'object') {
      throw new BadRequestException(`پاسخ ${operationName} نامعتبر است`);
    }
    return data;
  }

  private handleAxiosError(
    error: any,
    target: string,
    operationName: string,
  ): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }
    const status = error?.response?.status;
    const body = error?.response?.data;
    const msg =
      body?.response_body?.message || body?.message || error?.message;

    this.logger.error(
      `Zohal ${operationName} failed http=${status ?? 'no-response'} msg=${msg ?? String(error)} for ${target}`,
    );

    if (status === 401 || status === 403) {
      throw new ServiceUnavailableException(
        `کلید سرویس ${operationName} نامعتبر است`,
      );
    }
    throw new BadRequestException(msg || `${operationName} با خطا مواجه شد`);
  }
}
