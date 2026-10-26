import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export const ADMIN_TRANSACTION_SOURCES = ['gateway', 'wallet'] as const;
export const ADMIN_TRANSACTION_TYPES = [
  'SUBSCRIPTION',
  'BOOKING',
  'WALLET',
  'PUBLIC_PAGE',
  'DEPOSIT',
  'WITHDRAWAL',
  'INCOME',
  'REFUND',
] as const;
export const ADMIN_TRANSACTION_STATUSES = [
  'PAID',
  'COMPLETED',
  'PENDING',
  'FAILED',
  'CANCELED',
] as const;

export class AdminTransactionQueryDto {
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsIn(ADMIN_TRANSACTION_SOURCES)
  source?: (typeof ADMIN_TRANSACTION_SOURCES)[number];

  @IsOptional()
  @IsIn(ADMIN_TRANSACTION_TYPES)
  type?: (typeof ADMIN_TRANSACTION_TYPES)[number];

  @IsOptional()
  @IsIn(ADMIN_TRANSACTION_STATUSES)
  status?: (typeof ADMIN_TRANSACTION_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
