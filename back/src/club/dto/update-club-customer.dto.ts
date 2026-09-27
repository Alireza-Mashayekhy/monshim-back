import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateClubCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional({ description: 'برای حذف گروه مقدار null بفرستید' })
  @IsOptional()
  @IsUUID()
  groupId?: string | null;
}
