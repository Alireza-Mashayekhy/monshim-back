import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  fullName: string;

  @ApiProperty()
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(4)
  @MinLength(4)
  code: string;

  @ApiPropertyOptional()
  @IsOptional({ message: 'optional' })
  @Type(() => Date)
  birthDate?: Date;
}
