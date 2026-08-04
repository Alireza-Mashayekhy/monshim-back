// src/wallet/dto/create-card.dto.ts
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @Length(16, 16)
  cardNumber: string;

  @IsOptional()
  @IsString()
  shebaNumber?: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
