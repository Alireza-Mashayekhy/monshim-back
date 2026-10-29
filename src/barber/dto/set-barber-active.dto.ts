import { IsBoolean } from 'class-validator';

export class SetBarberActiveDto {
  @IsBoolean()
  isActive: boolean;
}
