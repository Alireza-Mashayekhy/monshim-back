// src/wallet/dto/transaction-query.dto.ts
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

import {
  TransactionStatus,
  TransactionType,
} from '../entities/transaction.entity';

export class TransactionQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @NormalizeNumber()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
