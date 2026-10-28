// src/auth/dto/register-barber.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ACTIVITY_TYPE_ERROR_MESSAGE,
  ACTIVITY_TYPE_VALUES,
} from 'src/barber/activity-types';
import { NormalizeDigits, NormalizeNumber } from 'src/common/utils/digits.util';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export const MIN_DEPOSIT_PRICE = 100_000;

class ServiceInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @NormalizeNumber()
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(MIN_DEPOSIT_PRICE, { message: 'حداقل مبلغ بیعانه ۱۰۰ هزار تومان است' })
  depositPrice?: number;

  @NormalizeNumber()
  @IsNumber()
  @IsNotEmpty()
  durationMinutes: number;
}

// auth/dto/register-barber.dto.ts
export class RegisterBarberDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  salonName: string;

  // فهرست مقادیر مجاز در `src/barber/activity-types.ts` تعریف شده تا مسیر
  // ثبت‌نام و مسیر ویرایش پروفایل از یک منبع مشترک استفاده کنند.
  @IsIn(ACTIVITY_TYPE_VALUES, { message: ACTIVITY_TYPE_ERROR_MESSAGE })
  @IsNotEmpty({ message: 'انتخاب نوع فعالیت سالن اجباری است' })
  activityType: string;

  declare provinceId: number;

  declare cityId: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  profileImage?: string; // حالا مسیر فایل ذخیره شده

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioImages?: string[]; // آرایه‌ای از مسیرهای فایل

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceInputDto)
  services?: ServiceInputDto[];

  @IsOptional()
  @NormalizeDigits()
  @IsString()
  referralCode?: string; // کد معرف آرایشگر دعوت کننده
}
export class CreateBarberDto {}
