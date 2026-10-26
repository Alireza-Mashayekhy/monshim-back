// src/wallet/dto/create-card.dto.ts
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { NormalizeDigits, toEnglishDigits } from 'src/common/utils/digits.util';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? toEnglishDigits(value).replace(/[\s-]/g, '')
      : value,
  )
  @IsString()
  @Length(16, 16)
  cardNumber: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? toEnglishDigits(value).trim().toUpperCase().replace(/[\s-]/g, '')
      : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'شماره شبا الزامی است' })
  @Length(26, 26, { message: 'شماره شبا باید ۲۶ کاراکتر باشد (IR + ۲۴ رقم)' })
  @Matches(/^IR\d{24}$/, {
    message: 'فرمت شماره شبا معتبر نیست (مثال: IRxxxxxxxxxxxxxxxxxxxxxxxx)',
  })
  shebaNumber: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsOptional()
  @NormalizeDigits()
  @IsString()
  nationalCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
