import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

import { BookingStatus } from '../entities/booking.entity';

export class BookingQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  date?: string;

  // بازه تاریخ (برای فیلترهای این هفته / این ماه)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // جستجو در نام یا شماره مشتری
  @IsOptional()
  @IsString()
  search?: string;
}
