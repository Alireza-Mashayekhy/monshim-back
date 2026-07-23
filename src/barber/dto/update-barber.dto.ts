// src/barber/dto/update-barber.dto.ts
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBarberDto {
  @IsOptional()
  @IsString()
  fullName?: string;

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

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string | null;
}
