import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';
import type { CommissionMode } from 'src/payment/deposit-amount';

import { CommissionBase } from '../entities/setting.entity';

export class CommissionTierDto {
  @IsOptional()
  @ValidateIf(
    (_, value) => value !== null && value !== undefined && value !== '',
  )
  @NormalizeNumber()
  @IsNumber()
  @Min(1, { message: 'سقف بازه پله باید بزرگ‌تر از صفر باشد' })
  upTo?: number | null;

  @NormalizeNumber()
  @IsNumber()
  @Min(0, { message: 'درصد هر پله باید بین ۰ تا ۱۰۰ باشد' })
  @Max(100, { message: 'درصد هر پله باید بین ۰ تا ۱۰۰ باشد' })
  percent: number;
}

export class UpdateSiteSettingsDto {
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercent?: number;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsEnum(CommissionBase)
  commissionBase?: CommissionBase;

  @IsOptional()
  @IsIn(['tiered', 'flat'])
  commissionMode?: CommissionMode;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'حداقل یک پله برای کمیسیون پلکانی لازم است' })
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  commissionTiers?: CommissionTierDto[];

  @IsOptional()
  @ValidateIf(
    (_, value) => value !== null && value !== undefined && value !== '',
  )
  @NormalizeNumber()
  @IsNumber()
  @Min(0, { message: 'سقف کمیسیون نمی‌تواند منفی باشد' })
  commissionMaxAmount?: number | null;
}
