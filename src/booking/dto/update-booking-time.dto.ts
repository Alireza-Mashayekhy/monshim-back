import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateBookingTimeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'ساعت باید در قالب HH:mm وارد شود',
  })
  time: string;
}
