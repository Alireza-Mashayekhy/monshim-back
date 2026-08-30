// src/ticket/ticket.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketAdminController } from './ticket.admin.controller';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketMessage])],
  controllers: [TicketController, TicketAdminController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
