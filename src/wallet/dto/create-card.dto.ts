// src/wallet/dto/create-card.dto.ts
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @Length(16, 16)
  cardNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'شماره شبا الزامی است' })
  @Length(26, 26, { message: 'شماره شبا باید ۲۶ کاراکتر باشد (IR + ۲۴ رقم)' })
  @Matches(/^IR\d{24}$/, {
    message: 'فرمت شماره شبا معتبر نیست (مثال: IRxxxxxxxxxxxxxxxxxxxxxxxx)',
  })
  shebaNumber: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
