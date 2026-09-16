// src/ticket/ticket.admin.controller.ts
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
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { SendMessageDto } from './dto/send-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { MessageSender } from './entities/ticket-message.entity';
import { TicketService } from './ticket.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/ticket')
export class TicketAdminController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * لیست همه تیکت‌ها
   * GET /admin/ticket
   */
  @Get()
  findAll(@Query() query: TicketQueryDto) {
    return this.ticketService.getAllTickets(query);
  }

  /**
   * جزئیات یک تیکت (به همراه همه پیام‌ها)
   * GET /admin/ticket/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketService.getTicket(id);
  }

  /**
   * ارسال پاسخ به تیکت (ادمین)
   * POST /admin/ticket/:id/messages
   */
  @Post(':id/messages')
  sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.ticketService.sendMessage(
      id,
      { role: MessageSender.ADMIN, userId: req.user?.id ?? null },
      dto,
    );
  }

  /**
   * بستن تیکت توسط ادمین
   * PATCH /admin/ticket/:id/close
   */
  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.ticketService.closeTicket(id, undefined, true);
  }
}
