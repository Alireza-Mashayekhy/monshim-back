import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';
import { NormalizeDigits, NormalizeNumber } from 'src/common/utils/digits.util';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  fullName: string;

  @ApiProperty()
  @NormalizeDigits()
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeDigits()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد' })
  nationalCode?: string;

  @ApiPropertyOptional()
  @NormalizeDigits()
  @IsString()
  @MaxLength(4)
  @MinLength(4)
  code: string;

  @ApiPropertyOptional()
  @IsOptional({ message: 'optional' })
  @Type(() => Date)
  birthDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'رمز عبور باید حداقل ۶ کاراکتر باشد' })
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  provinceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  cityId?: number;
}
