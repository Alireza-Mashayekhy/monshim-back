// src/ticket/ticket.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { MessageSender, TicketMessage } from './entities/ticket-message.entity';

type ViewerRole = 'user' | 'admin';

export interface TicketActor {
  role: MessageSender;
  userId: number | null;
}

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
  ) {}

  // ============ کاربر ============

  /** ایجاد تیکت جدید + اولین پیام */
  async createTicket(userId: number, dto: CreateTicketDto) {
    const ticket = this.ticketRepo.create({
      userId,
      subject: dto.subject,
      department: dto.department ?? null,
      priority: dto.priority,
      status: TicketStatus.OPEN,
    });
    const saved = await this.ticketRepo.save(ticket);

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId: saved.id,
        senderRole: MessageSender.USER,
        senderId: userId,
        message: dto.message,
        readByUser: true,
        readByAdmin: false,
      }),
    );

    const messages = await this.loadMessages(saved.id);

    return {
      message: 'تیکت با موفقیت ایجاد شد',
      data: this.formatTicketDetail(saved, messages, 'user'),
    };
  }

  /** لیست تیکت‌های کاربر جاری */
  async getMyTickets(userId: number, query: TicketQueryDto) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);

    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.userId = :userId', { userId });

    this.applyFilters(qb, query);

    qb.orderBy('ticket.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tickets, total] = await qb.getManyAndCount();

    const data: any[] = [];
    for (const ticket of tickets) {
      const messages = await this.loadMessages(ticket.id);
      data.push(this.formatTicket(ticket, messages, 'user'));
    }

    return {
      message: 'لیست تیکت‌ها با موفقیت دریافت شد',
      data,
      pagination: this.pagination(page, limit, total),
    };
  }

  /** جزئیات یک تیکت کاربر + علامت‌گذاری پیام‌های ادمین به عنوان خوانده‌شده */
  async getMyTicket(userId: number, ticketId: string) {
    const ticket = await this.findTicketOrFail(ticketId, userId);

    let messages = await this.loadMessages(ticketId);
    const unreadForUser = messages.filter(
      m => m.senderRole === MessageSender.ADMIN && !m.readByUser,
    );
    if (unreadForUser.length) {
      unreadForUser.forEach(m => (m.readByUser = true));
      await this.messageRepo.save(unreadForUser);
      messages = await this.loadMessages(ticketId);
    }

    return {
      message: 'جزئیات تیکت با موفقیت دریافت شد',
      data: this.formatTicketDetail(ticket, messages, 'user'),
    };
  }

  // ============ ادمین ============

  /** لیست همه تیکت‌ها (ادمین) */
  async getAllTickets(query: TicketQueryDto) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);

    const qb = this.ticketRepo.createQueryBuilder('ticket');

    this.applyFilters(qb, query);

    qb.orderBy('ticket.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tickets, total] = await qb.getManyAndCount();

    const data: any[] = [];
    for (const ticket of tickets) {
      const messages = await this.loadMessages(ticket.id);
      data.push(this.formatTicket(ticket, messages, 'admin'));
    }

    return {
      message: 'لیست تیکت‌ها با موفقیت دریافت شد',
      data,
      pagination: this.pagination(page, limit, total),
    };
  }

  /** جزئیات یک تیکت (ادمین) + علامت‌گذاری پیام‌های کاربر به عنوان خوانده‌شده */
  async getTicket(ticketId: string) {
    const ticket = await this.findTicketOrFail(ticketId);

    let messages = await this.loadMessages(ticketId);
    const unreadForAdmin = messages.filter(
      m => m.senderRole === MessageSender.USER && !m.readByAdmin,
    );
    if (unreadForAdmin.length) {
      unreadForAdmin.forEach(m => (m.readByAdmin = true));
      await this.messageRepo.save(unreadForAdmin);
      messages = await this.loadMessages(ticketId);
    }

    return {
      message: 'جزئیات تیکت با موفقیت دریافت شد',
      data: this.formatTicketDetail(ticket, messages, 'admin'),
    };
  }

  // ============ مشترک ============

  /** ارسال پیام جدید در گفتگو (کاربر یا ادمین) */
  async sendMessage(ticketId: string, actor: TicketActor, dto: SendMessageDto) {
    const ticket =
      actor.role === MessageSender.USER
        ? await this.findTicketOrFail(ticketId, actor.userId)
        : await this.findTicketOrFail(ticketId);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'این تیکت بسته شده است و امکان ارسال پیام وجود ندارد',
      );
    }

    const isAdmin = actor.role === MessageSender.ADMIN;

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderRole: actor.role,
        senderId: actor.userId,
        message: dto.message,
        readByUser: !isAdmin,
        readByAdmin: isAdmin,
      }),
    );

    // به‌روزرسانی وضعیت:
    // - پیام ادمین → منتظر پاسخ کاربر (ANSWERED)
    // - پیام کاربر → منتظر پاسخ پشتیبانی (OPEN)
    ticket.status = isAdmin ? TicketStatus.ANSWERED : TicketStatus.OPEN;
    const saved = await this.ticketRepo.save(ticket);

    const messages = await this.loadMessages(ticketId);

    return {
      message: 'پیام با موفقیت ارسال شد',
      data: this.formatTicketDetail(
        saved,
        messages,
        isAdmin ? 'admin' : 'user',
      ),
    };
  }

  /** بستن تیکت (توسط کاربرِ صاحب تیکت یا ادمین) */
  async closeTicket(ticketId: string, userId?: number, isAdmin = false) {
    const ticket = isAdmin
      ? await this.findTicketOrFail(ticketId)
      : await this.findTicketOrFail(ticketId, userId);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('این تیکت قبلاً بسته شده است');
    }

    ticket.status = TicketStatus.CLOSED;
    const saved = await this.ticketRepo.save(ticket);

    const messages = await this.loadMessages(ticketId);

    return {
      message: 'تیکت با موفقیت بسته شد',
      data: this.formatTicketDetail(
        saved,
        messages,
        isAdmin ? 'admin' : 'user',
      ),
    };
  }

  // ============ ابزارهای داخلی ============

  private async findTicketOrFail(ticketId: string, userId?: number | null) {
    const ticket = await this.ticketRepo.findOne({
      where: userId ? { id: ticketId, userId } : { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('تیکت مورد نظر یافت نشد');
    }
    return ticket;
  }

  private loadMessages(ticketId: string) {
    return this.messageRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  private applyFilters(qb: SelectQueryBuilder<Ticket>, query: TicketQueryDto) {
    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }
    if (query.search) {
      qb.andWhere('ticket.subject LIKE :search', {
        search: `%${query.search}%`,
      });
    }
    return qb;
  }

  private normalizePage(page?: number) {
    const p = Number(page);
    return Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;
  }

  private normalizeLimit(limit?: number) {
    const l = Number(limit);
    return Number.isFinite(l) && l > 0 ? Math.floor(l) : 10;
  }

  private pagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private formatMessage(m: TicketMessage) {
    return {
      id: m.id,
      ticketId: m.ticketId,
      senderRole: m.senderRole,
      senderId: m.senderId,
      message: m.message,
      readByUser: m.readByUser,
      readByAdmin: m.readByAdmin,
      createdAt: m.createdAt,
    };
  }

  private formatTicket(
    t: Ticket,
    messages: TicketMessage[],
    viewer: ViewerRole,
  ) {
    const unreadCount =
      viewer === 'user'
        ? messages.filter(
            m => m.senderRole === MessageSender.ADMIN && !m.readByUser,
          ).length
        : messages.filter(
            m => m.senderRole === MessageSender.USER && !m.readByAdmin,
          ).length;

    const lastMessage =
      messages.length > 0
        ? this.formatMessage(messages[messages.length - 1])
        : null;

    return {
      id: t.id,
      userId: t.userId,
      subject: t.subject,
      department: t.department,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessage,
      unreadCount,
    };
  }

  private formatTicketDetail(
    t: Ticket,
    messages: TicketMessage[],
    viewer: ViewerRole,
  ) {
    return {
      ...this.formatTicket(t, messages, viewer),
      messages: messages.map(m => this.formatMessage(m)),
    };
  }
}
