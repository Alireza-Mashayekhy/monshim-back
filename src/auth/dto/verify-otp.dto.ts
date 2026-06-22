import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class SendVerifyOtp {
  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(11)
  @MinLength(11)
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(4)
  @MinLength(4)
  code: string;
}
