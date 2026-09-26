import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { BarberReviewStatus } from '../entities/barber-review.entity';

export class ModerateBarberReviewDto {
  @IsIn([BarberReviewStatus.APPROVED, BarberReviewStatus.REJECTED])
  status: BarberReviewStatus.APPROVED | BarberReviewStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string | null;
}
