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
