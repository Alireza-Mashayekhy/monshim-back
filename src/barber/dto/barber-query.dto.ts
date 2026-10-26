import { IsNumber, IsOptional, Min } from 'class-validator';
import { QueryDto } from 'src/common/query';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export class BarberQueryDto extends QueryDto {
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  provinceId?: number;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  minRating?: number;
}
