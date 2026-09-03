import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';
import { IRAN_PHONE_REGEX } from 'src/common/constants/constants';

export class SendOtpDto {
  @ApiProperty()
  @IsNotEmpty()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;
}
