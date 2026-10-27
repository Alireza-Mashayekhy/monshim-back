import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdatePublicPageDiscountDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,32}$/)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
