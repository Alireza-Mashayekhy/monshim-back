import { IsOptional, IsString, Matches } from 'class-validator';

export class InitiatePublicPagePaymentDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,32}$/)
  discountCode?: string;
}
