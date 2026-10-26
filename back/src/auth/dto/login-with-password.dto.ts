import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { NormalizeDigits } from 'src/common/utils/digits.util';

export class LoginWithPasswordDto {
  @ApiProperty()
  @NormalizeDigits()
  @IsNotEmpty()
  @MaxLength(11)
  @MinLength(11)
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
