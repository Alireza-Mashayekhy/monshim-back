// src/ticket/ticket.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { MessageSender } from './entities/ticket-message.entity';
import { TicketService } from './ticket.service';

@Controller('ticket')
@UseGuards(AuthGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * ایجاد تیکت جدید
   * POST /ticket
   */
  @Post()
  create(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(req.user.id, dto);
  }

  /**
   * لیست تیکت‌های کاربر جاری
   * GET /ticket
   */
  @Get()
  findAll(@Req() req: any, @Query() query: TicketQueryDto) {
    return this.ticketService.getMyTickets(req.user.id, query);
  }

  /**
   * جزئیات یک تیکت (به همراه همه پیام‌ها)
   * GET /ticket/:id
   */
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketService.getMyTicket(req.user.id, id);
  }

  /**
   * ارسال پیام جدید در گفتگو (کاربر)
   * POST /ticket/:id/messages
   */
  @Post(':id/messages')
  sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.ticketService.sendMessage(
      id,
      { role: MessageSender.USER, userId: req.user.id },
      dto,
    );
  }

  /**
   * بستن تیکت توسط صاحب تیکت
   * PATCH /ticket/:id/close
   */
  @Patch(':id/close')
  close(@Req() req: any, @Param('id') id: string) {
    return this.ticketService.closeTicket(id, req.user.id);
  }
}
