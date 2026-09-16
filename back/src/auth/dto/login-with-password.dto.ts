import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginWithPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(11)
  @MinLength(11)
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
