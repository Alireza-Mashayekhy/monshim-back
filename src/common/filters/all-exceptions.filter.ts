/**
 * فیلتر سراسری خطاها:
 * خطاهای غیر HTTP (مثل خطای multer هنگام آپلود یا خطای MySQL) را به
 * پاسخهای معنادار با کد وضعیت درست تبدیل میکند؛ بقیهٔ خطاها
 * با همان رفتار پیشفرض Nest مدیریت میشوند.
 */
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';

import { getDriverError, isDuplicateEntryError } from '../utils/db-error.util';

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'حجم فایل ارسالی بیشتر از حد مجاز است',
  LIMIT_FILE_COUNT: 'تعداد فایلهای ارسالی بیش از حد مجاز است',
  LIMIT_UNEXPECTED_FILE: 'فایل در فیلد غیرمنتظرهای ارسال شده است',
  LIMIT_FIELD_COUNT: 'تعداد فیلدهای ارسالی بیش از حد مجاز است',
  LIMIT_FIELD_KEY: 'نام فیلد ارسالی بیش از حد مجاز است',
  LIMIT_FIELD_VALUE: 'مقدار فیلد ارسالی بیش از حد مجاز است',
  LIMIT_PART_COUNT: 'تعداد بخشهای ارسالی بیش از حد مجاز است',
};

const TOO_LARGE_MULTER_CODES = [
  'LIMIT_FILE_SIZE',
  'LIMIT_FIELD_VALUE',
  'LIMIT_PART_COUNT',
];

/**
 * @nestjs/platform-express خطاهای multer را به BadRequestException /
 * PayloadTooLargeException با پیام انگلیسی تبدیل می‌کند؛ برای پیام فارسی
 * باید همان پیام‌ها شناسایی شوند.
 */
const MULTER_RAW_MESSAGES: Record<string, string> = {
  'File too large': 'حجم فایل ارسالی بیشتر از حد مجاز است',
  'Unexpected field': 'فایل در فیلد غیرمنتظره‌ای ارسال شده است',
  'Too many files': 'تعداد فایل‌های ارسالی بیش از حد مجاز است',
  'Too many parts': 'تعداد بخش‌های ارسالی بیش از حد مجاز است',
  'Too many fields': 'تعداد فیلدهای ارسالی بیش از حد مجاز است',
  'Field name missing': 'نام فیلد ارسالی مشخص نیست',
  'Field name too long': 'نام فیلد ارسالی بیش از حد مجاز است',
  'Field value too long': 'مقدار فیلد ارسالی بیش از حد مجاز است',
  'Boundary not found': 'ساختار درخواست ارسالی معتبر نیست',
  'Malformed part header': 'ساختار درخواست ارسالی معتبر نیست',
  'Unexpected end of form': 'درخواست ارسالی ناقص است',
  'Unexpected end of file': 'درخواست ارسالی ناقص است',
};

function mapMulterMessage(message: string): string | null {
  for (const [rawMessage, persianMessage] of Object.entries(
    MULTER_RAW_MESSAGES,
  )) {
    if (message.startsWith(rawMessage)) {
      return persianMessage;
    }
  }

  return null;
}

interface MulterLikeError {
  name: string;
  code: string;
  message?: string;
}

function isMulterError(error: unknown): error is MulterLikeError {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { name?: unknown }).name === 'MulterError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

/**
 * تبدیل خطاهای شناختهشدهٔ غیر HTTP به HttpException.
 * خروجی null یعنی خطا شناختهشده نیست و باید به Nest سپرده شود.
 */
export function mapToHttpException(exception: unknown): HttpException | null {
  if (isMulterError(exception)) {
    const message = MULTER_MESSAGES[exception.code] ?? 'فایل ارسالی معتبر نیست';
    return TOO_LARGE_MULTER_CODES.includes(exception.code)
      ? new PayloadTooLargeException(message)
      : new BadRequestException(message);
  }

  if (exception instanceof PayloadTooLargeException) {
    return new PayloadTooLargeException('حجم فایل ارسالی بیشتر از حد مجاز است');
  }

  if (exception instanceof BadRequestException) {
    const multerMessage = mapMulterMessage(exception.message);
    return multerMessage ? new BadRequestException(multerMessage) : null;
  }

  if (exception instanceof HttpException) {
    return null;
  }

  if (isDuplicateEntryError(exception)) {
    return new ConflictException('این اطلاعات قبلاً ثبت شده است');
  }

  if (getDriverError(exception)) {
    return new InternalServerErrorException(
      'خطا در پردازش اطلاعات. لطفاً دوباره تلاش کنید',
    );
  }

  return null;
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const mapped = mapToHttpException(exception);

    if (!mapped) {
      super.catch(exception, host);
      return;
    }

    if (getDriverError(exception)) {
      this.logger.error(`database error: ${String(exception)}`);
    } else {
      this.logger.warn(`request rejected: ${String(exception)}`);
    }

    super.catch(mapped, host);
  }
}
