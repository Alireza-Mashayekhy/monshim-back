import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(11)
  @MinLength(11)
  phone: string;
}
