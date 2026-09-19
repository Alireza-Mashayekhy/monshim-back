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
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export const ACTIVITY_TYPE_VALUES = ['women', 'men', 'both'] as const;

export const MIN_DEPOSIT_PRICE = 100_000;

class ServiceInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(MIN_DEPOSIT_PRICE, { message: 'حداقل مبلغ بیعانه ۱۰۰ هزار تومان است' })
  depositPrice?: number;

  @IsNumber()
  @IsNotEmpty()
  durationMinutes: number;
}

// auth/dto/register-barber.dto.ts
export class RegisterBarberDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  salonName: string;

  @IsIn(ACTIVITY_TYPE_VALUES, { message: 'نوع فعالیت معتبر نیست' })
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
  @IsString()
  referralCode?: string; // کد معرف آرایشگر دعوت کننده
}
export class CreateBarberDto {}
