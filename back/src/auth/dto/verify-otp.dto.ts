import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';

export class SendVerifyOtp {
  @ApiProperty()
  @IsNotEmpty()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(4)
  @MinLength(4)
  code: string;
}
