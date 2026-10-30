import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { isSchemaNotReadyError } from '../utils/db-error.util';
import { mapToHttpException } from './all-exceptions.filter';

interface DriverErrorStub {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

function queryFailedError(driverError: DriverErrorStub) {
  return new QueryFailedError(
    'INSERT INTO public_page_discounts (...) VALUES (...)',
    [],
    Object.assign(
      new Error(driverError.sqlMessage ?? 'query failed'),
      driverError,
    ),
  );
}

describe('AllExceptionsFilter → mapToHttpException', () => {
  it('نبودِ جدول در پایگاه داده را به ۵۰۳ با پیام روشن تبدیل می‌کند (نه ۵۰۰ مبهم)', () => {
    const error = queryFailedError({
      code: 'ER_NO_SUCH_TABLE',
      errno: 1146,
      sqlMessage: "Table 'monshim.public_page_discounts' doesn't exist",
    });

    expect(isSchemaNotReadyError(error)).toBe(true);
    expect(mapToHttpException(error)).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('ستونِ جامانده در پایگاه داده هم «اسکیمای ناآماده» شناخته می‌شود', () => {
    const error = queryFailedError({
      code: 'ER_BAD_FIELD_ERROR',
      errno: 1054,
      sqlMessage: "Unknown column 'percent_off' in 'field list'",
    });

    expect(mapToHttpException(error)).toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('خطای نبود جدول در driverهای غیر MySQL هم تشخیص داده می‌شود', () => {
    expect(
      isSchemaNotReadyError(new Error('no such table: public_page_discounts')),
    ).toBe(true);
  });

  it('رکورد تکراری را به ۴۰۹ نگاشت می‌کند', () => {
    const error = queryFailedError({
      code: 'ER_DUP_ENTRY',
      errno: 1062,
      sqlMessage:
        "Duplicate entry 'AUTUMN20' for key 'uq_public_page_discount_code'",
    });

    expect(mapToHttpException(error)).toBeInstanceOf(ConflictException);
  });

  it('بقیهٔ خطاهای پایگاه داده مثل قبل ۵۰۰ می‌شوند', () => {
    const error = queryFailedError({
      code: 'ER_LOCK_WAIT_TIMEOUT',
      errno: 1205,
      sqlMessage: 'Lock wait timeout exceeded',
    });

    expect(mapToHttpException(error)).toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('خطاهای HTTP دست‌نخورده به خود Nest سپرده می‌شوند', () => {
    expect(mapToHttpException(new BadRequestException('bad'))).toBeNull();
  });
});
