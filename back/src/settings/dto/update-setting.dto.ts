// src/settings/dto/update-site-settings.dto.ts

import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

import { CommissionBase } from '../entities/setting.entity';

export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsEnum(CommissionBase)
  commissionBase?: CommissionBase;
}
