import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  Ticket,
  TicketDepartment,
  TicketPriority,
  TicketStatus,
} from './entities/ticket.entity';
import { MessageSender, TicketMessage } from './entities/ticket-message.entity';
import { TicketService } from './ticket.service';

describe('TicketService - اعلان بله هنگام ثبت تیکت', () => {
  function buildSetup() {
    const savedTicket = {
      id: 'ticket-1',
      userId: 10,
      subject: 'مشکل در پرداخت رزرو',
      department: TicketDepartment.PAYMENT,
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date('2026-10-23T12:00:00.000Z'),
      updatedAt: new Date('2026-10-23T12:00:00.000Z'),
    } as Ticket;

    const ticketRepo: any = {
      create: jest.fn((data: Partial<Ticket>) => ({ ...data })),
      save: jest.fn().mockResolvedValue(savedTicket),
    };
    const messageRepo: any = {
      create: jest.fn((data: Partial<TicketMessage>) => ({ ...data })),
      save: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      find: jest.fn().mockResolvedValue([
        {
          id: 'msg-1',
          ticketId: 'ticket-1',
          senderRole: MessageSender.USER,
          senderId: 10,
          message: 'سلام، موقع پرداخت رزرو با خطا مواجه شدم.',
          readByUser: true,
          readByAdmin: false,
          createdAt: new Date('2026-10-23T12:00:00.000Z'),
        },
      ]),
    };
    const baleNotificationService: any = {
      notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
    };

    const service = new TicketService(
      ticketRepo,
      messageRepo,
      baleNotificationService,
    );

    return { service, ticketRepo, messageRepo, baleNotificationService };
  }

  const dto: CreateTicketDto = {
    subject: 'مشکل در پرداخت رزرو',
    message: 'سلام، موقع پرداخت رزرو با خطا مواجه شدم.',
    department: TicketDepartment.PAYMENT,
    priority: TicketPriority.HIGH,
  };

  it('پس از ثبت موفق تیکت، اعلان بله را با اطلاعات تیکت برای ادمین ارسال می‌کند', async () => {
    const { service, baleNotificationService } = buildSetup();

    const result = await service.createTicket(10, dto);

    expect(baleNotificationService.notifyTicketCreated).toHaveBeenCalledTimes(
      1,
    );
    expect(baleNotificationService.notifyTicketCreated).toHaveBeenCalledWith({
      ticketId: 'ticket-1',
      userId: 10,
      subject: 'مشکل در پرداخت رزرو',
      department: TicketDepartment.PAYMENT,
      priority: TicketPriority.HIGH,
      message: dto.message,
      createdAt: expect.any(Date),
    });
    // پاسخ API نباید تغییر کند
    expect(result.message).toBe('تیکت با موفقیت ایجاد شد');
    expect(result.data.id).toBe('ticket-1');
  });

  it('اگر ارسال اعلان بله شکست بخورد، ثبت تیکت همچنان با موفقیت انجام می‌شود', async () => {
    const { service, baleNotificationService } = buildSetup();
    baleNotificationService.notifyTicketCreated.mockRejectedValueOnce(
      new Error('Bale timeout'),
    );

    await expect(service.createTicket(10, dto)).resolves.toMatchObject({
      message: 'تیکت با موفقیت ایجاد شد',
    });
  });

  it('در نبود سرویس اعلان بله (اختیاری)، ثبت تیکت بدون خطا انجام می‌شود', async () => {
    const { ticketRepo, messageRepo } = buildSetup();
    const serviceWithoutBale = new TicketService(ticketRepo, messageRepo);

    await expect(
      serviceWithoutBale.createTicket(10, dto),
    ).resolves.toMatchObject({ message: 'تیکت با موفقیت ایجاد شد' });
  });
});
