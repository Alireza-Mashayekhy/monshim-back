import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export class ClubCustomerQueryDto {
  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
