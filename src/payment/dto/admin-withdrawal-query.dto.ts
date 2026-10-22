import { Type } from 'class-transformer';
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

export const ADMIN_WITHDRAWAL_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
] as const;

export type AdminWithdrawalStatus = (typeof ADMIN_WITHDRAWAL_STATUSES)[number];

export class AdminWithdrawalQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @IsIn(ADMIN_WITHDRAWAL_STATUSES)
  status?: AdminWithdrawalStatus;

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
