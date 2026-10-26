import { IsInt, IsNumber, Min } from 'class-validator';
import { NormalizeNumber } from 'src/common/utils/digits.util';

export class UpdateSubscriptionPlanDto {
  @NormalizeNumber()
  @IsNumber()
  @Min(0)
  price: number;

  @NormalizeNumber()
  @IsInt()
  @Min(0)
  smsCount: number;
}
