/**
 * کمککنندههای خطاهای پایگاه داده (TypeORM / MySQL).
 */
import { QueryFailedError } from 'typeorm';

export interface DriverError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  message?: string;
}

export function getDriverError(error: unknown): DriverError | undefined {
  if (error instanceof QueryFailedError) {
    return (error as QueryFailedError & { driverError?: DriverError })
      .driverError;
  }

  if (error && typeof error === 'object' && 'driverError' in error) {
    return (error as { driverError?: DriverError }).driverError;
  }

  return undefined;
}

/** خطای تکراری بودن مقدار یکتای جدول (MySQL: ER_DUP_ENTRY / 1062) */
export function isDuplicateEntryError(error: unknown): boolean {
  const driverError = getDriverError(error);
  if (!driverError) {
    return false;
  }
  return driverError.code === 'ER_DUP_ENTRY' || driverError.errno === 1062;
}

/**
 * خطای نبودِ جدول (یا ستون) در پایگاه داده.
 *
 * این خطا یعنی اسکیمای پایگاه داده با کد هم‌تراز نیست — معمولاً چون در
 * production `synchronize` خاموش است و فایل SQL مربوط به قابلیت اجرا نشده.
 * MySQL: `ER_NO_SUCH_TABLE` / ۱۱۴۶ و `ER_BAD_FIELD_ERROR` / ۱۰۵۴.
 */
export function isSchemaNotReadyError(error: unknown): boolean {
  const driverError = getDriverError(error);

  if (driverError) {
    if (
      driverError.code === 'ER_NO_SUCH_TABLE' ||
      driverError.code === 'ER_BAD_FIELD_ERROR' ||
      driverError.errno === 1146 ||
      driverError.errno === 1054
    ) {
      return true;
    }
  }

  const message =
    driverError?.sqlMessage ??
    driverError?.message ??
    (error instanceof Error ? error.message : '');

  return (
    /no such table/i.test(message) ||
    /table '[^']+' doesn't exist/i.test(message) ||
    /unknown column/i.test(message)
  );
}
