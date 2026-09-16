// src/ticket/dto/create-ticket.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TicketDepartment, TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({
    description: 'موضوع تیکت',
    example: 'مشکل در پرداخت رزرو',
  })
  @IsString()
  @IsNotEmpty({ message: 'موضوع تیکت الزامی است' })
  @MinLength(3, { message: 'موضوع باید حداقل ۳ کاراکتر باشد' })
  @MaxLength(200, { message: 'موضوع نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد' })
  subject: string;

  @ApiProperty({
    description: 'متن اولین پیام تیکت',
    example: 'سلام، موقع پرداخت رزرو با خطا مواجه شدم.',
  })
  @IsString()
  @IsNotEmpty({ message: 'متن پیام الزامی است' })
  @MaxLength(5000, { message: 'متن پیام نمی‌تواند بیشتر از ۵۰۰۰ کاراکتر باشد' })
  message: string;

  @ApiPropertyOptional({
    description: 'دپارتمان مرتبط',
    enum: TicketDepartment,
    example: TicketDepartment.PAYMENT,
  })
  @IsOptional()
  @IsEnum(TicketDepartment, { message: 'دپارتمان نامعتبر است' })
  department?: TicketDepartment;

  @ApiPropertyOptional({
    description: 'اولویت تیکت',
    enum: TicketPriority,
    example: TicketPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: 'اولویت نامعتبر است' })
  priority?: TicketPriority;
}
