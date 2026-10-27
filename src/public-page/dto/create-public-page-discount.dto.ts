import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class CreatePublicPageDiscountDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,32}$/)
  code: string;

  @IsInt()
  @Min(1)
  @Max(100)
  percentOff: number;
}
