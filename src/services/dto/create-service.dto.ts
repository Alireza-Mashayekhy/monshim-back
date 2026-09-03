import {
  Allow,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositPrice?: number;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Allow()
  barberId?: number;
}
