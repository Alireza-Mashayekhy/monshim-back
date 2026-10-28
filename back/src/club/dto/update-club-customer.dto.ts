import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';
import { NormalizeMobile } from 'src/common/utils/phone.util';

export class UpdateClubCustomerDto {
  @ApiPropertyOptional({ example: 'علی رضایی' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  /**
   * شمارهٔ موبایل مشتری.
   *
   * ⚠️ قبلاً این فیلد در DTO نبود و چون `ValidationPipe` با
   * `forbidNonWhitelisted: true` کار می‌کند، فرانت که شماره را هم در بدنهٔ
   * PATCH می‌فرستاد پاسخ ۴۰۰ می‌گرفت؛ در نتیجه **هیچ‌کدام** از تغییرات
   * (حتی نام و نام خانوادگی) ذخیره نمی‌شد. حالا شماره هم پذیرفته، نرمال و
   * اعتبارسنجی می‌شود.
   */
  @ApiPropertyOptional({ example: '09123456789' })
  @IsOptional()
  @NormalizeMobile()
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone?: string;

  @ApiPropertyOptional({ description: 'برای حذف گروه مقدار null بفرستید' })
  @IsOptional()
  @IsUUID()
  groupId?: string | null;
}
