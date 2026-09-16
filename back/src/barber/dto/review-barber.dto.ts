import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBarberDto {
  @IsBoolean()
  isApproved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string | null;
}
