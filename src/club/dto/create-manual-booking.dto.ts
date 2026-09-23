import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export const REMINDER_HOURS_OPTIONS = [1, 2, 4, 6, 12, 24] as const;

export class CreateManualBookingDto {
  @ApiProperty({ description: 'شناسه مشتری باشگاه' })
  @IsUUID()
  @IsNotEmpty()
  clubCustomerId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ example: '2026-09-02' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barberNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNote?: string;

  /** ارسال لینک بیعانه به مشتری */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sendDepositLink?: boolean;

  /** ارسال پیامک یادآوری به مشتری */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sendSmsReminder?: boolean;

  /** چند ساعت قبل از نوبت پیامک یادآوری ارسال شود */
  @ApiPropertyOptional({ enum: REMINDER_HOURS_OPTIONS })
  @IsOptional()
  @IsInt()
  @IsIn(REMINDER_HOURS_OPTIONS)
  reminderHours?: number;
}
