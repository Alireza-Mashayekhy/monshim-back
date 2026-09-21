import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateSubscriptionPlanDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  smsCount: number;
}
