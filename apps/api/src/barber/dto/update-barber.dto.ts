// src/barber/dto/update-barber.dto.ts
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ALLOWED_SLOT_INTERVAL_MINUTES } from 'src/booking/slot-intervals';
import { NormalizeDigits, NormalizeNumber } from 'src/common/utils/digits.util';

import {
  ACTIVITY_TYPE_ERROR_MESSAGE,
  ACTIVITY_TYPE_VALUES,
  type ActivityTypeValue,
} from '../activity-types';

export class UpdateBarberDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @NormalizeDigits()
  @IsString()
  nationalCode?: string | null;

  @IsOptional()
  @IsString()
  salonName?: string;

  /**
   * نوع فعالیت سالن (بانوان/آقایان/هردو)؛ همان گزینه‌ای که آرایشگر در
   * ثبت‌نام انتخاب کرده و می‌تواند در ویرایش پروفایل هم تغییرش دهد.
   * مقدار `null` پذیرفته نمی‌شود چون نوع فعالیت نباید پاک شود.
   */
  @IsOptional()
  @IsIn(ACTIVITY_TYPE_VALUES, { message: ACTIVITY_TYPE_ERROR_MESSAGE })
  activityType?: ActivityTypeValue;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  provinceId?: number | null;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  cityId?: number | null;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  workStartTime?: string | null; // HH:mm

  @IsOptional()
  @IsString()
  workEndTime?: string | null;

  @IsOptional()
  @NormalizeNumber()
  @IsInt()
  @IsIn([...ALLOWED_SLOT_INTERVAL_MINUTES], {
    message: 'بازه زمانی رزرو باید یکی از مقادیر ۱۵، ۳۰، ۴۵ یا ۶۰ دقیقه باشد',
  })
  slotIntervalMinutes?: number;

  @IsOptional()
  @IsString()
  profileImage?: string | null;

  /**
   * توجه: فیلدهای `isApproved` و `rejectionReason` عمداً از این DTO حذف
   * شده‌اند. این همان DTOای است که آرایشگر برای ویرایش پروفایل خودش
   * (`PATCH /barber/profile/me`) می‌فرستد و قبلاً می‌توانست با
   * `{ "isApproved": true }` بدون بررسی ادمین، خودش را تایید کند.
   * تایید و رد فقط از مسیر ادمین (`PATCH /admin/barber/:id/review`) انجام می‌شود.
   */
}
