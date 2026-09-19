import {
  Allow,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// حداقل بیعانه: ۱۰۰ هزار تومان
export const MIN_DEPOSIT_PRICE = 100_000;
// حداکثر بیعانه: ۳۰٪ مبلغ کل
export const DEPOSIT_MAX_RATIO = 0.3;

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(MIN_DEPOSIT_PRICE, {
    message: 'حداقل مبلغ بیعانه ۱۰۰ هزار تومان است',
  })
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
