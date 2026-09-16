import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class InitiateBookingPaymentDto {
  @ApiProperty({ description: 'شناسه آرایشگر (User.id)' })
  @IsNotEmpty()
  barberId: number | string;

  @ApiProperty({ description: 'شناسه سرویس' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

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
}
