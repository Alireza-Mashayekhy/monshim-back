import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class ChargeWalletDto {
  @ApiProperty({ description: 'مبلغ به تومان' })
  @IsNumber()
  @Type(() => Number)
  @Min(1000)
  amount: number;
}
