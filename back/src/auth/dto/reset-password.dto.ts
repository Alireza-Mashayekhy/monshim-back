import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
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

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
