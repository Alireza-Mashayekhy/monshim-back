import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveWithdrawalDto {
  /** شناسهٔ پیگیری واریز بانکی (اختیاری) */
  @IsOptional()
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
