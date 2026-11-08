import { IsString, Matches } from 'class-validator';

export class ValidatePublicPageDiscountDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,32}$/)
  code: string;
}
