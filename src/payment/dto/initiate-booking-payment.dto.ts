import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { REMINDER_HOURS_OPTIONS } from 'src/booking/reminder-options';

export class InitiateBookingPaymentDto {
  @ApiProperty({ description: 'شناسه آرایشگر (User.id)' })
  @IsNotEmpty()
  barberId: number | string;

  @ApiProperty({
    description: 'لیست شناسه سرویس‌ها (برای چند-سرویس)',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @ApiProperty({
    description: 'شناسه سرویس (تک‌سرویس، سازگاری قبلی)',
    required: false,
  })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ description: 'تاریخ نوبت' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'ساعت نوبت' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({ description: 'توضیحات اختیاری', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    enum: REMINDER_HOURS_OPTIONS,
    description: 'زمان یادآوری رایگان، چند ساعت قبل از نوبت',
  })
  @IsOptional()
  @IsInt()
  @IsIn(REMINDER_HOURS_OPTIONS)
  reminderHours?: number;
}
