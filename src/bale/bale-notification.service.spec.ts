import { BaleNotificationService } from './bale-notification.service';

describe('BaleNotificationService', () => {
  function buildSetup(enabled = true) {
    const baleClient: any = {
      isEnabled: jest.fn().mockReturnValue(enabled),
      broadcastToAdmins: jest.fn().mockResolvedValue(1),
    };
    const userRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        fullName: 'علی رضایی',
        phone: '09121112233',
        barberProfile: { id: 'bp-1', salonName: 'پیرایش رویال' },
      }),
    };
    const barberProfileRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'bp-1',
        userId: 10,
        salonName: 'پیرایش رویال',
      }),
    };
    const bookingRepo: any = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'bk-1',
          date: '2026-10-23',
          time: '16:30:00',
          price: 300000,
          customer: { fullName: 'محمد کریمی', phone: '09350001122' },
          service: { name: 'اصلاح مو و ریش' },
          barber: {
            salonName: 'پیرایش رویال',
            user: { fullName: 'علی رضایی', phone: '09121112233' },
          },
        },
      ]),
      findOne: jest.fn(),
    };
    const planRepo: any = {
      findOne: jest.fn().mockResolvedValue({
        id: 'plan-1',
        name: 'پلن حرفه‌ای ۳ ماهه',
        durationDays: 90,
        smsCount: 300,
      }),
    };

    const service = new BaleNotificationService(
      baleClient,
      userRepo,
      barberProfileRepo,
      bookingRepo,
      planRepo,
    );

    return { service, baleClient, userRepo, bookingRepo, planRepo };
  }

  it('پیام درخواست برداشت آرایشگر را با جزئیات کامل حساب ارسال می‌کند', async () => {
    const { service, baleClient } = buildSetup(true);

    await service.notifyWithdrawalRequested({
      userId: 10,
      transaction: {
        id: 'tx-99',
        amount: 1_200_000,
        createdAt: new Date('2026-10-23T12:00:00.000Z'),
      } as any,
      card: {
        bankName: 'ملت',
        ownerName: 'علی رضایی',
        cardNumber: '6104337700001111',
        shebaNumber: 'IR120120000000001234567890',
      } as any,
      remainingBalance: 350_000,
      note: 'تسویه هفتگی',
    });

    expect(baleClient.broadcastToAdmins).toHaveBeenCalledTimes(1);
    const sentText = baleClient.broadcastToAdmins.mock.calls[0][0] as string;
    expect(sentText).toContain('درخواست برداشت جدید آرایشگر');
    expect(sentText).toContain('پیرایش رویال');
    expect(sentText).toContain('۱,۲۰۰,۰۰۰ تومان');
    expect(sentText).toContain('۳۵۰,۰۰۰ تومان');
    expect(sentText).toContain('IR120120000000001234567890');
  });

  it('پیام رزرو آنلاین پرداخت‌شده و خرید اشتراک را ارسال می‌کند', async () => {
    const { service, baleClient } = buildSetup(true);

    await service.notifyOnlineBookingPaid(
      {
        id: 'pay-1',
        userId: 20,
        amount: 110_000,
        orderId: 'BOOK-1001',
        refNumber: '987654321',
        paidAt: new Date('2026-10-23T12:00:00.000Z'),
        metadata: JSON.stringify({
          totalPrice: 300_000,
          depositAmount: 100_000,
          commissionAmount: 10_000,
        }),
      } as any,
      ['bk-1'],
    );

    await service.notifySubscriptionPurchased(
      {
        id: 'pay-2',
        userId: 10,
        amount: 450_000,
        orderId: 'SUB-2002',
        refNumber: '11223344',
        paidAt: new Date('2026-10-23T12:00:00.000Z'),
      } as any,
      'plan-1',
    );

    expect(baleClient.broadcastToAdmins).toHaveBeenCalledTimes(2);
    expect(baleClient.broadcastToAdmins.mock.calls[0][0]).toContain(
      'رزرو آنلاین جدید',
    );
    expect(baleClient.broadcastToAdmins.mock.calls[1][0]).toContain(
      'خرید اشتراک جدید',
    );
    expect(baleClient.broadcastToAdmins.mock.calls[1][0]).toContain(
      'پلن حرفه‌ای ۳ ماهه',
    );
  });

  it('در صورت بروز خطا در ارسال، خطا را مهار می‌کند و جریان اصلی را نمی‌شکند', async () => {
    const { service, baleClient } = buildSetup(true);
    baleClient.broadcastToAdmins.mockRejectedValueOnce(
      new Error('Bale timeout'),
    );

    await expect(
      service.notifyWalletCharged({
        id: 'pay-3',
        userId: 10,
        amount: 200_000,
        orderId: 'WAL-3003',
      } as any),
    ).resolves.toBeUndefined();
  });
});
