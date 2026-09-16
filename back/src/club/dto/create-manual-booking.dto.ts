import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

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
  note?: string;
}
