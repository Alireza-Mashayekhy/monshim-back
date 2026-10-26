import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { NormalizeDigits } from 'src/common/utils/digits.util';

export class ResetPasswordDto {
  @ApiProperty()
  @NormalizeDigits()
  @IsNotEmpty()
  @MaxLength(11)
  @MinLength(11)
  phone: string;

  @ApiProperty()
  @NormalizeDigits()
  @IsNotEmpty()
  @MaxLength(4)
  @MinLength(4)
  code: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
