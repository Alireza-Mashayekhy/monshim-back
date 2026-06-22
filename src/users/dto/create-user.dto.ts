import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(11)
  @MinLength(11)
  phone: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(5)
  @MinLength(5)
  code: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  birthDate: Date;
}
