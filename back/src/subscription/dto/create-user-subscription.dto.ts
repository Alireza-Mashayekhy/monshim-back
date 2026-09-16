import { IsUUID } from 'class-validator';

export class CreateUserSubscriptionDto {
  @IsUUID()
  subscriptionPlanId: string;
}
