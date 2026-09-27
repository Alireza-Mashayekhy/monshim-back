import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';

export class CreateClubCustomerDto {
  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName: string;

  @ApiProperty({ example: '09123456789' })
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;
}
