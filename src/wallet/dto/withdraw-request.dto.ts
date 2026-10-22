// src/wallet/dto/withdraw-request.dto.ts
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class WithdrawRequestDto {
  @IsNumber()
  @Min(1, { message: 'حداقل مبلغ برداشت ۱ تومان است' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsOptional()
  @IsString()
  description?: string;
}
