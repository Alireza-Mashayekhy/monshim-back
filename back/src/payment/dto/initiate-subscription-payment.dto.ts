import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateSubscriptionPaymentDto {
  @ApiProperty({ description: 'شناسه پلن اشتراک' })
  @IsString()
  @IsNotEmpty()
  subscriptionPlanId: string;
}
