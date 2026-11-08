import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export class ChargeWalletDto {
  @ApiProperty({ description: 'مبلغ به تومان' })
  @NormalizeNumber()
  @IsNumber()
  @Min(1000)
  amount: number;
}
