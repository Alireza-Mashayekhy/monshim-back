// src/ticket/dto/ticket-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

export class TicketQueryDto {
  @ApiPropertyOptional({
    description: 'شماره صفحه',
    default: 1,
    example: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'تعداد آیتم در هر صفحه',
    default: 10,
    example: 10,
  })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'فیلتر بر اساس وضعیت تیکت',
    enum: TicketStatus,
    example: TicketStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TicketStatus, { message: 'وضعیت نامعتبر است' })
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'فیلتر بر اساس اولویت',
    enum: TicketPriority,
    example: TicketPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: 'اولویت نامعتبر است' })
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'جستجو در موضوع تیکت',
    example: 'پرداخت',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
