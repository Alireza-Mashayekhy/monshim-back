// src/auth/dto/register-barber.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

class ServiceInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  durationMinutes: number;
}

// auth/dto/register-barber.dto.ts
export class RegisterBarberDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  salonName: string;

  @IsNumber()
  @IsNotEmpty()
  provinceId: number;

  @IsNumber()
  @IsNotEmpty()
  cityId: number;

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
}
