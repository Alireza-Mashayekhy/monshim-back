import { ConfigService } from '@nestjs/config';

import { BALE_BUTTONS, BALE_CALLBACK_PREFIX } from './bale.constants';
import { BaleBotService } from './bale-bot.service';
import { BaleClientService } from './bale-client.service';

describe('BaleBotService & BaleClientService', () => {
  it('تأیید توکن امنیتی وبهوک و پنهان‌سازی توکن در BaleClientService درست کار می‌کند', () => {
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          BALE_BOT_TOKEN: '999999:SUPER_SECRET_BALE_TOKEN',
          BALE_CHAT_IDS: '111111, 222222',
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    const client = new BaleClientService(config);
    expect(client.isEnabled()).toBe(true);
    expect(client.getAdminChatIds()).toEqual(['111111', '222222']);
    expect(client.isAuthorizedChat(111111)).toBe(true);
    expect(client.isAuthorizedChat(999999)).toBe(false);

    const secret = client.getWebhookSecret();
    expect(secret.length).toBe(32);
    expect(client.verifyWebhookSecret(secret)).toBe(true);
    expect(client.verifyWebhookSecret('wrong-secret')).toBe(false);
  });

  it('کاربر غیرمجاز به گزارش‌ها دسترسی ندارد ولی با /id شناسه چت خود را می‌بیند', async () => {
    const baleClient: any = {
      isEnabled: jest.fn().mockReturnValue(true),
      isAuthorizedChat: jest.fn((id: any) => String(id) === '100'),
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(true),
    };
    const reportService: any = {
      generateReportText: jest.fn().mockResolvedValue('REPORT_CONTENT'),
      generatePendingWithdrawalsText: jest
        .fn()
        .mockResolvedValue('WITHDRAWALS_CONTENT'),
    };

    const bot = new BaleBotService(baleClient, reportService);

    // تلاش کاربر غیرمجاز برای گرفتن گزارش روزانه
    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 999, type: 'private' },
        from: { id: 999 },
        text: '/daily',
      },
    });
    expect(reportService.generateReportText).not.toHaveBeenCalled();
    expect(baleClient.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('دسترسی مدیریتی ندارد'),
    );

    // دستور /id برای کاربر جدید جهت راه‌اندازی
    baleClient.sendMessage.mockClear();
    await bot.handleUpdate({
      update_id: 2,
      message: {
        message_id: 11,
        chat: { id: 999, type: 'private' },
        from: { id: 999 },
        text: '/id',
      },
    });
    expect(baleClient.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('999'),
      undefined,
    );

    // تلاش کاربر غیرمجاز روی دکمه شیشه‌ای
    await bot.handleUpdate({
      update_id: 3,
      callback_query: {
        id: 'cq-1',
        from: { id: 999 },
        message: { message_id: 50, chat: { id: 999, type: 'private' } },
        data: `${BALE_CALLBACK_PREFIX.REPORT}daily`,
      },
    });
    expect(reportService.generateReportText).not.toHaveBeenCalled();
    expect(baleClient.answerCallbackQuery).toHaveBeenCalledWith(
      'cq-1',
      expect.stringContaining('دسترسی'),
      true,
    );
  });

  it('مدیر مجاز می‌تواند گزارش روزانه، هفتگی، ماهانه، سالانه و صف برداشت را دریافت کند', async () => {
    const baleClient: any = {
      isEnabled: jest.fn().mockReturnValue(true),
      isAuthorizedChat: jest.fn((id: any) => String(id) === '100'),
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(true),
    };
    const reportService: any = {
      generateReportText: jest
        .fn()
        .mockImplementation((period: string) =>
          Promise.resolve(`REPORT:${period}`),
        ),
      generatePendingWithdrawalsText: jest
        .fn()
        .mockResolvedValue('PENDING_WITHDRAWALS'),
    };

    const bot = new BaleBotService(baleClient, reportService);

    for (const [buttonText, expectedPeriod] of [
      [BALE_BUTTONS.DAILY_REPORT, 'daily'],
      [BALE_BUTTONS.WEEKLY_REPORT, 'weekly'],
      [BALE_BUTTONS.MONTHLY_REPORT, 'monthly'],
      [BALE_BUTTONS.YEARLY_REPORT, 'yearly'],
    ] as const) {
      await bot.handleUpdate({
        update_id: 10,
        message: {
          message_id: 20,
          chat: { id: 100, type: 'private' },
          from: { id: 100 },
          text: buttonText,
        },
      });
      expect(reportService.generateReportText).toHaveBeenLastCalledWith(
        expectedPeriod,
      );
    }

    // کلیک روی دکمه شیشه‌ای گزارش ماهانه باید پیام را درجا ویرایش کند
    await bot.handleUpdate({
      update_id: 20,
      callback_query: {
        id: 'cq-monthly',
        from: { id: 100 },
        message: { message_id: 77, chat: { id: 100, type: 'private' } },
        data: `${BALE_CALLBACK_PREFIX.REPORT}monthly`,
      },
    });
    expect(baleClient.editMessageText).toHaveBeenCalledWith(
      100,
      77,
      'REPORT:monthly',
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
  });
});
