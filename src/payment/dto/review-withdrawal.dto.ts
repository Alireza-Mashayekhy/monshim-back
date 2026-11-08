import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NormalizeDigits } from 'src/common/utils/digits.util';

export class ApproveWithdrawalDto {
  /** شناسهٔ پیگیری واریز بانکی (اختیاری) */
  @IsOptional()
  @NormalizeDigits()
  @IsString()
  @MaxLength(128)
  transferReference?: string;
}

export class RejectWithdrawalDto {
  /** دلیل رد شدن برداشت (اختیاری، در توضیح تراکنش ذخیره می‌شود) */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;
}
