// src/barber/dto/update-barber.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBarberDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  nationalCode?: string | null;

  @IsOptional()
  @IsString()
  salonName?: string;

  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  workStartTime?: string | null; // HH:mm

  @IsOptional()
  @IsString()
  workEndTime?: string | null;

  @IsOptional()
  @IsString()
  profileImage?: string;

  /**
   * توجه: فیلدهای `isApproved` و `rejectionReason` عمداً از این DTO حذف
   * شده‌اند. این همان DTOای است که آرایشگر برای ویرایش پروفایل خودش
   * (`PATCH /barber/profile/me`) می‌فرستد و قبلاً می‌توانست با
   * `{ "isApproved": true }` بدون بررسی ادمین، خودش را تایید کند.
   * تایید و رد فقط از مسیر ادمین (`PATCH /admin/barber/:id/review`) انجام می‌شود.
   */
}
