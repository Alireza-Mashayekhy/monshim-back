import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeDigits } from 'src/common/utils/digits.util';

export class SettleAdminRefundDto {
  @IsOptional()
  @NormalizeDigits()
  @IsString()
  @MaxLength(128)
  transferReference?: string;
}
