import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SettleAdminRefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  transferReference?: string;
}
