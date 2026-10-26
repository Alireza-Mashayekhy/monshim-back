import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export class QueryDto {
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  cityId?: number;
}
