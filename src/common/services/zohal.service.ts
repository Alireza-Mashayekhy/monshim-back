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
  first_name?: string;
  last_name?: string;
  owners?: Array<{
    name?: string;
    first_name?: string;
    last_name?: string;
  }>;
  bank_name?: string;
  bankName?: string;
  deposit_number?: string;
  is_transferable?: boolean;
  [key: string]: unknown;
}

export interface CardInquiryData {
  iban?: string;
  IBAN?: string;
  sheba?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  bank_name?: string;
  bankName?: string;
  card_number?: string;
  deposit_number?: string;
  [key: string]: unknown;
}

export interface MatchResult {
  matched: boolean;
  [key: string]: unknown;
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

/**
 * خطاهای سیستمی/تنظیماتی زحل (عدم فعال بودن وب‌سرویس روی توکن، اتمام اعتبار پنل زحل، کلید نامعتبر و ...)
 * نباید به صورت خطای ۴۰۰ (ورودی نامعتبر کاربر) نمایش داده شوند.
 */
const ZOHAL_UPSTREAM_ERROR_PATTERNS = [
  /permission/i,
  /unauthorized/i,
  /forbidden/i,
  /not[\s_-]*active/i,
  /not[\s_-]*found/i,
  /insufficient/i,
  /balance/i,
  /credit/i,
  /token/i,
  /دسترسی/,
  /غیرفعال/,
  /فعال نیست/,
  /اعتبار/,
  /موجودی/,
  /کلید/,
  /توکن/,
];

@Injectable()
export class ZohalService {
  private readonly logger = new Logger(ZohalService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = (
      this.configService.get<string>('ZOHAL_API_KEY') ||
      this.configService.get<string>('ZOHAL_TOKEN') ||
      this.configService.get<string>('ZOHAL_API_TOKEN') ||
      ''
    ).trim();
    this.baseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('ZOHAL_BASE_URL'),
    );
  }

  public normalizeBaseUrl(raw?: string): string {
    const trimmed = String(raw || ZOHAL_BASE_URL)
      .trim()
      .replace(/\/+$/, '');
    if (!trimmed) return ZOHAL_BASE_URL;

    // اگر در .env به اشتباه آدرس کامل یک اندپوینت (مثل .../services/inquiry/iban) قرار گرفته باشد،
    // آن را به ریشه /api/v0 اصلاح می‌کنیم تا الحاق مسیرهای بعدی ۴۰۴ ندهد.
    const withoutEndpoint = trimmed.replace(
      /\/services\/inquiry(?:\/.*)?$/i,
      '',
    );
    if (/^https?:\/\/[^/]+$/i.test(withoutEndpoint)) {
      return `${withoutEndpoint}/api/v0`;
    }
    return withoutEndpoint;
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

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * استعلام شبا از زحل
   * POST /api/v0/services/inquiry/iban
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
          headers: this.getAuthHeaders(),
        },
      );

      return this.extractResponseData<IbanInquiryData>(
        response.data,
        normalizedIban,
        'استعلام شبا',
      );
    } catch (error: unknown) {
      return this.handleAxiosError(error, normalizedIban, 'استعلام شبا');
    }
  }

  /**
   * استعلام کارت و تبدیل کارت به شبا از زحل (نسخه رسمی v0 زحل)
   * ۱) POST /api/v0/services/inquiry/card_to_iban با body: { card_number: "6219..." }
   * ۲) فالبک: POST /api/v0/services/inquiry/card_inquiry با body: { card_number: "6219..." }
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

    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/card_to_iban`,
        {
          card_number: normalizedCard,
        },
        {
          timeout: ZOHAL_TIMEOUT_MS,
          headers: this.getAuthHeaders(),
        },
      );

      const raw = this.extractResponseData<CardInquiryData>(
        response.data,
        normalizedCard,
        'تبدیل کارت به شبا',
      );

      const resolvedIban =
        (typeof raw.iban === 'string' && raw.iban) ||
        (typeof raw.IBAN === 'string' && raw.IBAN) ||
        (typeof raw.sheba === 'string' && raw.sheba) ||
        '';

      return {
        ...raw,
        iban: resolvedIban ? this.normalizeIban(resolvedIban) : '',
      };
    } catch (primaryError: unknown) {
      // اگر خطای اعتبارسنجی واقعی کارت از سمت زحل برگشته باشد (مثلاً شماره کارت نامعتبر است)، همان را پرتاب کن
      if (primaryError instanceof BadRequestException) {
        throw primaryError;
      }

      // اگر سرویس card_to_iban روی توکن زحل فعال نبود (403/404)، اندپوینت card_inquiry را امتحان می‌کنیم
      try {
        const fallbackResponse = await axios.post(
          `${this.baseUrl}/services/inquiry/card_inquiry`,
          {
            card_number: normalizedCard,
          },
          {
            timeout: ZOHAL_TIMEOUT_MS,
            headers: this.getAuthHeaders(),
          },
        );

        const raw = this.extractResponseData<CardInquiryData>(
          fallbackResponse.data,
          normalizedCard,
          'استعلام کارت',
        );

        const resolvedIban =
          (typeof raw.iban === 'string' && raw.iban) ||
          (typeof raw.IBAN === 'string' && raw.IBAN) ||
          (typeof raw.sheba === 'string' && raw.sheba) ||
          '';

        return {
          ...raw,
          iban: resolvedIban ? this.normalizeIban(resolvedIban) : '',
        };
      } catch (fallbackError: unknown) {
        return this.handleAxiosError(
          fallbackError,
          normalizedCard,
          'استعلام کارت',
        );
      }
    }
  }

  /**
   * استعلام شاهکار: تطبیق شماره موبایل و کد ملی
   * POST /api/v0/services/inquiry/shahkar
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
          headers: this.getAuthHeaders(),
        },
      );

      const data = this.extractResponseData<MatchResult>(
        response.data,
        cleanPhone,
        'استعلام شاهکار',
      );

      const rec = data as Record<string, unknown>;
      const explicitBool =
        typeof rec.matched === 'boolean'
          ? rec.matched
          : typeof rec.is_matched === 'boolean'
            ? rec.is_matched
            : typeof rec.match === 'boolean'
              ? rec.match
              : typeof rec.response === 'boolean'
                ? rec.response
                : null;

      if (explicitBool !== true) {
        throw new BadRequestException(
          'شماره موبایل وارد شده با کد ملی مطابقت ندارد. سیم‌کارت باید به نام صاحب کد ملی باشد.',
        );
      }

      return { ...data, matched: true };
    } catch (error: unknown) {
      return this.handleAxiosError(error, cleanPhone, 'استعلام شاهکار');
    }
  }

  /**
   * تطبیق شماره شبا با کد ملی در زحل
   * POST /api/v0/services/inquiry/check_iban_with_national_code
   * body: { iban: "IR...", national_code: "...", birth_date: "1375/01/01" }
   */
  async matchIbanWithNationalCode(params: {
    iban: string;
    nationalCode: string;
    birthDateJalali?: string;
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

    // وب‌سرویس check_iban_with_national_code در زحل به birth_date شمسی نیاز دارد؛
    // اگر تاریخ تولد ثبت نشده باشد، از فراخوانی ناقص صرف‌نظر کرده و به تطبیق نام صاحب شبا تکیه می‌کنیم.
    if (!params.birthDateJalali) {
      return { matched: true };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/services/inquiry/check_iban_with_national_code`,
        {
          iban: cleanIban,
          national_code: cleanNationalCode,
          birth_date: params.birthDateJalali,
        },
        {
          timeout: ZOHAL_TIMEOUT_MS,
          headers: this.getAuthHeaders(),
        },
      );

      const data = this.extractResponseData<MatchResult>(
        response.data,
        cleanIban,
        'تطبیق شبا با کد ملی',
      );

      const rec = data as Record<string, unknown>;
      const explicitBool =
        typeof rec.matched === 'boolean'
          ? rec.matched
          : typeof rec.is_matched === 'boolean'
            ? rec.is_matched
            : typeof rec.match === 'boolean'
              ? rec.match
              : null;

      if (explicitBool === false) {
        throw new BadRequestException('شماره شبا با کد ملی شما مطابقت ندارد');
      }

      return { ...data, matched: true };
    } catch (error: unknown) {
      return this.handleAxiosError(error, cleanIban, 'تطبیق شبا با کد ملی');
    }
  }

  /**
   * اعتبارسنجی جامع مالکیت کارت بانکی و شبا با تطبیق شماره موبایل، کد ملی و نام کاربر:
   * ۱. بررسی فرمت کد ملی طبق الگوریتم ثبت‌احوال
   * ۲. بررسی فرمت کارت (۱۶ رقم) و شبا (IR + ۲۴ رقم)
   * ۳. استعلام شاهکار (تطبیق مالکیت شماره موبایل با کد ملی — در صورت فعال بودن روی توکن زحل)
   * ۴. استعلام شبا از زحل (الزامی در محیط عملیاتی)
   * ۵. استعلام تبدیل کارت به شبا (`card_to_iban` — در صورت فعال بودن روی توکن زحل، بررسی برابری شبا)
   * ۶. بررسی تطابق نام صاحب حساب بانکی با نام کاربر در سامانه
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

    // در حالت ماک، شبیه‌سازی با موفقیت انجام می‌شود
    if (this.isMockActive()) {
      await this.verifyShahkar({
        phone: params.userPhone,
        nationalCode: cleanNationalCode,
      });

      return {
        name: params.userFullName || 'صاحب حساب تایید شده',
        bank_name: 'بانک پاسارگاد',
        iban: cleanIban,
        cardNumber: cleanCard,
        nationalCode: cleanNationalCode,
      };
    }

    // ۴. استعلام شاهکار (تطبیق شماره موبایل با کد ملی)
    // اگر عدم تطابق واقعی باشد (BadRequestException)، بلافاصله رد می‌شود؛
    // اما اگر وب‌سرویس شاهکار روی توکن زحل فعال نباشد (ServiceUnavailableException)،
    // هشدار ثبت شده و استعلام شبا + تطبیق نام مالک حساب ادامه می‌یابد.
    try {
      await this.verifyShahkar({
        phone: params.userPhone,
        nationalCode: cleanNationalCode,
      });
    } catch (shahkarError: unknown) {
      if (shahkarError instanceof BadRequestException) {
        throw shahkarError;
      }
      this.logger.warn(
        `Zohal shahkar inquiry skipped: ${this.describeError(shahkarError)}. Continuing with IBAN verification.`,
      );
    }

    // ۵. استعلام شبا از زحل (هستهٔ الزامی احراز مالکیت حساب بانکی)
    const ibanData = await this.inquiryIban(cleanIban);

    // ۶. استعلام کارت از زحل (`card_to_iban` / `card_inquiry`)
    // فقط در صورت مغایرت واقعی شماره کارت و شبا (BadRequestException) خطا پرتاب می‌شود؛
    // خطای ۴۰۴ یا عدم دسترسی توکن به وب‌سرویس کارت باعث شکست ثبت کارت نمی‌شود.
    let cardData: CardInquiryData | null = null;
    try {
      cardData = await this.inquiryCard(cleanCard);
    } catch (cardError: unknown) {
      if (cardError instanceof BadRequestException) {
        throw cardError;
      }
      this.logger.warn(
        `Zohal card inquiry skipped: ${this.describeError(cardError)}. Continuing with IBAN verification.`,
      );
    }

    if (cardData?.iban) {
      const cardIban = this.normalizeIban(cardData.iban);
      if (cardIban && cardIban !== cleanIban) {
        throw new BadRequestException(
          'شماره کارت وارد شده با شماره شبای وارد شده مطابقت ندارد',
        );
      }
    }

    // ۷. تطبیق نام و نام خانوادگی صاحب حساب بانکی با نام کاربر
    const verifiedOwnerName =
      this.extractOwnerFullName(ibanData) ||
      this.extractOwnerFullName(cardData) ||
      '';

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
      this.extractBankName(ibanData) || this.extractBankName(cardData) || '';

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
    const ownerName = this.extractOwnerFullName(data);

    if (!ownerName) {
      if (!this.apiKey && process.env.NODE_ENV !== 'production') {
        return data;
      }
      this.logger.warn(
        `Zohal did not return owner name for ${this.normalizeIban(params.iban)}, skipping name check`,
      );
      return data;
    }

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
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .toUpperCase()
      .replace(/[\s-]/g, '');
  }

  public isValidIban(iban: string): boolean {
    return /^IR\d{24}$/.test(this.normalizeIban(iban));
  }

  public normalizeCardNumber(card: string): string {
    return String(card ?? '')
      .trim()
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[\s-]/g, '');
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
      .replace(/[\s-+]/g, '');

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
    return (
      String(name ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        // یکسان‌سازی ی و ک و الف و ه عربی/فارسی
        .replace(/ي/g, 'ی')
        .replace(/ئ/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/ة/g, 'ه')
        .replace(/أ|إ|آ/g, 'ا')
        // حذف اعراب و تنوین
        .replace(/[\u064B-\u065F]/g, '')
        // حذف نیم‌فاصله و تبدیل به فاصله
        .replace(/\u200c/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  public isNameMatched(ownerName: string, userName: string): boolean {
    const nOwner = this.normalizeName(ownerName);
    const nUser = this.normalizeName(userName);
    if (!nOwner || !nUser) return false;
    if (nOwner === nUser) return true;

    // تطبیق بدون فاصله برای نام‌های مرکب (مثل «علی رضا مشایخی» با «علیرضا مشایخی»)
    const compactOwner = nOwner.replace(/\s+/g, '');
    const compactUser = nUser.replace(/\s+/g, '');
    if (
      compactOwner === compactUser ||
      compactOwner.includes(compactUser) ||
      compactUser.includes(compactOwner)
    ) {
      return true;
    }

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

  private extractOwnerFullName(
    data?: IbanInquiryData | CardInquiryData | null,
  ): string {
    if (!data) return '';
    if (typeof data.name === 'string' && data.name.trim()) {
      return data.name.trim();
    }
    const directParts = [data.first_name, data.last_name]
      .filter(
        (part): part is string => typeof part === 'string' && !!part.trim(),
      )
      .map(part => part.trim());
    if (directParts.length > 0) {
      return directParts.join(' ');
    }
    if (
      'owners' in data &&
      Array.isArray(data.owners) &&
      data.owners.length > 0
    ) {
      const firstOwner = data.owners[0];
      if (firstOwner) {
        if (typeof firstOwner.name === 'string' && firstOwner.name.trim()) {
          return firstOwner.name.trim();
        }
        const ownerParts = [firstOwner.first_name, firstOwner.last_name]
          .filter(
            (part): part is string => typeof part === 'string' && !!part.trim(),
          )
          .map(part => part.trim());
        if (ownerParts.length > 0) {
          return ownerParts.join(' ');
        }
      }
    }
    return '';
  }

  private extractBankName(
    data?: IbanInquiryData | CardInquiryData | null,
  ): string {
    if (!data) return '';
    if (typeof data.bank_name === 'string' && data.bank_name.trim()) {
      return data.bank_name.trim();
    }
    if (typeof data.bankName === 'string' && data.bankName.trim()) {
      return data.bankName.trim();
    }
    return '';
  }

  private isUpstreamServiceIssue(codeOrMsg: string): boolean {
    return ZOHAL_UPSTREAM_ERROR_PATTERNS.some(pattern =>
      pattern.test(codeOrMsg),
    );
  }

  private toSafeString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private extractResponseData<T>(
    body: unknown,
    target: string,
    operationName: string,
  ): T {
    const rec =
      body && typeof body === 'object'
        ? (body as Record<string, unknown>)
        : null;
    const responseBody =
      rec?.response_body && typeof rec.response_body === 'object'
        ? (rec.response_body as Record<string, unknown>)
        : null;

    const errorCode = responseBody?.error_code ?? rec?.error_code;
    if (errorCode) {
      const errorCodeStr = this.toSafeString(errorCode);
      const rawMessage =
        (typeof responseBody?.message === 'string' && responseBody.message) ||
        (typeof rec?.message === 'string' && rec.message) ||
        errorCodeStr;

      this.logger.warn(
        `Zohal ${operationName} error ${errorCodeStr}: ${rawMessage} for ${target}`,
      );

      // اگر خطای زحل مربوط به دسترسی توکن، غیرفعال بودن سرویس یا کمبود شارژ زحل باشد،
      // خطای سیستمی (ServiceUnavailableException) پرتاب می‌کنیم نه خطای ورودی کاربر (400).
      if (
        this.isUpstreamServiceIssue(errorCodeStr) ||
        this.isUpstreamServiceIssue(rawMessage)
      ) {
        throw new ServiceUnavailableException(
          `سرویس ${operationName} در حال حاضر در دسترس نیست. لطفاً دقایقی دیگر تلاش کنید.`,
        );
      }

      throw new BadRequestException(
        rawMessage || `${operationName} ناموفق بود`,
      );
    }

    const candidate = responseBody?.data ?? rec?.data ?? responseBody ?? rec;
    if (!candidate || typeof candidate !== 'object') {
      throw new ServiceUnavailableException(
        `پاسخ دریافتی از سرویس ${operationName} معتبر نیست`,
      );
    }
    return candidate as T;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private handleAxiosError(
    error: unknown,
    target: string,
    operationName: string,
  ): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ServiceUnavailableException
    ) {
      throw error;
    }

    const axiosErr = error as {
      message?: string;
      response?: {
        status?: number;
        data?: {
          message?: unknown;
          error_code?: unknown;
          response_body?: {
            message?: unknown;
            error_code?: unknown;
          };
        };
      };
    };

    const status = axiosErr?.response?.status;
    const body = axiosErr?.response?.data;
    const upstreamMsg =
      (typeof body?.response_body?.message === 'string' &&
        body.response_body.message.trim()) ||
      (typeof body?.message === 'string' && body.message.trim()) ||
      '';
    const upstreamCode = this.toSafeString(
      body?.response_body?.error_code ?? body?.error_code,
    );

    this.logger.error(
      `Zohal ${operationName} failed http=${status ?? 'no-response'} code=${upstreamCode || '-'} msg=${upstreamMsg || axiosErr?.message || String(error)} for ${target}`,
    );

    if (status === 401 || status === 403) {
      throw new ServiceUnavailableException(
        `کلید یا دسترسی سرویس ${operationName} معتبر نیست`,
      );
    }

    if (status === 404) {
      throw new ServiceUnavailableException(
        `وب‌سرویس ${operationName} در سرویس‌دهنده یافت نشد یا فعال نیست`,
      );
    }

    if (!status || status >= 500 || status === 429) {
      throw new ServiceUnavailableException(
        `اختلال موقت در ارتباط با سرویس ${operationName}. لطفاً چند لحظه دیگر تلاش کنید`,
      );
    }

    // برای وضعیت‌های 400/422: اگر پیام زحل نشان‌دهندهٔ عدم دسترسی توکن/کمبود اعتبار زحل باشد، خطای ۵۰۳ بده
    if (
      this.isUpstreamServiceIssue(upstreamCode) ||
      this.isUpstreamServiceIssue(upstreamMsg)
    ) {
      throw new ServiceUnavailableException(
        `سرویس ${operationName} در حال حاضر در دسترس نیست`,
      );
    }

    // خطای واقعی اعتبارسنجی ورودی کاربر از سمت زحل (هرگز پیام انگلیسی خام Axios نمایش داده نشود)
    throw new BadRequestException(
      upstreamMsg ||
        `${operationName} ناموفق بود؛ لطفاً صحت اطلاعات بانکی وارد شده را بررسی کنید`,
    );
  }
}
