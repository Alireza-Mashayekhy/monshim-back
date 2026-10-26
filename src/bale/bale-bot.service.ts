import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  BALE_BUTTONS,
  BALE_CALLBACK_PREFIX,
  BALE_REPORT_PERIODS,
  BaleReportPeriod,
} from './bale.constants';
import {
  BaleCallbackQuery,
  BaleClientService,
  BaleInlineKeyboardButton,
  BaleMessage,
  BaleReplyMarkup,
  BaleUpdate,
} from './bale-client.service';
import { BaleReportService } from './bale-report.service';
import { toEnDigits } from './bale-time.util';

@Injectable()
export class BaleBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BaleBotService.name);

  private destroyed = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastUpdateId: number | undefined;
  private consecutivePollFailures = 0;

  constructor(
    private readonly baleClient: BaleClientService,
    private readonly baleReportService: BaleReportService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.baleClient.isEnabled()) {
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const mode = this.baleClient.getMode();
    if (mode === 'webhook') {
      await this.initializeWebhookMode();
      return;
    }

    void this.initializePollingMode();
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async initializeWebhookMode(): Promise<void> {
    const baseWebhookUrl = this.baleClient.getWebhookBaseUrl();
    if (!baseWebhookUrl) {
      this.logger.warn(
        'BALE_MODE=webhook تنظیم شده اما BALE_WEBHOOK_URL خالی است؛ به حالت polling سوییچ می‌شود.',
      );
      void this.initializePollingMode();
      return;
    }

    const secret = this.baleClient.getWebhookSecret();
    const fullWebhookUrl = baseWebhookUrl.endsWith(`/${secret}`)
      ? baseWebhookUrl
      : `${baseWebhookUrl}/${secret}`;

    const ok = await this.baleClient.setWebhook(fullWebhookUrl);
    if (ok) {
      this.logger.log('وبهوک ربات بله با موفقیت ثبت شد.');
    } else {
      this.logger.warn(
        'ثبت وبهوک ربات بله ناموفق بود؛ لطفاً BALE_WEBHOOK_URL و اتصال به tapi.bale.ai را بررسی کنید.',
      );
    }
  }

  private async initializePollingMode(): Promise<void> {
    // اگر از قبل وبهوکی روی ربات ست شده باشد، getUpdates در بله خطای 409 می‌دهد.
    await this.baleClient.deleteWebhook();
    this.logger.log(
      `ربات بله در حالت polling فعال شد (شناسه چت‌های مجاز: ${this.baleClient.getAdminChatIds().length} مورد).`,
    );
    this.scheduleNextPoll(500);
  }

  private scheduleNextPoll(delayMs: number): void {
    if (this.destroyed || !this.baleClient.isEnabled()) return;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }

    this.pollTimer = setTimeout(() => {
      void this.runPollCycle();
    }, delayMs);
  }

  private async runPollCycle(): Promise<void> {
    if (this.destroyed || !this.baleClient.isEnabled()) return;

    let nextDelay = this.baleClient.getPollIntervalMs();

    try {
      const offset =
        this.lastUpdateId !== undefined ? this.lastUpdateId + 1 : undefined;
      const response = await this.baleClient.getUpdates(offset, 50, 5);

      if (response.conflict) {
        this.logger.warn(
          'تداخل وبهوک در getUpdates ربات بله تشخیص داده شد؛ در حال حذف وبهوک و ادامهٔ polling...',
        );
        await this.baleClient.deleteWebhook();
        this.consecutivePollFailures += 1;
      } else if (!response.ok) {
        this.consecutivePollFailures += 1;
      } else {
        this.consecutivePollFailures = 0;

        for (const update of response.updates) {
          if (
            typeof update.update_id === 'number' &&
            (this.lastUpdateId === undefined ||
              update.update_id > this.lastUpdateId)
          ) {
            this.lastUpdateId = update.update_id;
          }

          await this.handleUpdate(update);
        }
      }
    } catch (error: any) {
      this.consecutivePollFailures += 1;
      this.logger.warn(
        `خطا در چرخهٔ دریافت پیام‌های ربات بله: ${error?.message ?? String(error)}`,
      );
    }

    if (this.consecutivePollFailures > 0) {
      const backoffFactor = Math.min(this.consecutivePollFailures, 5);
      nextDelay = Math.min(30_000, nextDelay * Math.pow(2, backoffFactor - 1));
    }

    this.scheduleNextPoll(nextDelay);
  }

  /**
   * پردازش یک رویداد ورودی از بله (مشترک بین حالت polling و webhook).
   */
  async handleUpdate(update: BaleUpdate): Promise<void> {
    if (!update || typeof update !== 'object') return;

    try {
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      const message = update.message;
      if (message?.text) {
        await this.handleTextMessage(message);
      }
    } catch (error: any) {
      this.logger.error(
        `خطا در پردازش پیام ربات بله (update_id=${update.update_id}): ${error?.message ?? String(error)}`,
      );
    }
  }

  private isAuthorized(
    chatId: string | number | undefined,
    fromUserId?: number,
  ): boolean {
    if (this.baleClient.isAuthorizedChat(chatId)) return true;
    if (
      fromUserId !== undefined &&
      this.baleClient.isAuthorizedChat(fromUserId)
    ) {
      return true;
    }
    return false;
  }

  private async handleTextMessage(message: BaleMessage): Promise<void> {
    const chatId = message.chat?.id;
    if (chatId === undefined || chatId === null) return;

    const rawText = String(message.text ?? '').trim();
    if (!rawText) return;

    const normalized = this.normalizeCommand(rawText);
    const authorized = this.isAuthorized(chatId, message.from?.id);

    // دستور مشاهدهٔ شناسهٔ چت حتی قبل از تنظیم BALE_CHAT_IDS هم پاسخ می‌دهد تا راه‌اندازی ساده باشد
    if (this.isChatIdCommand(normalized)) {
      await this.sendChatIdInfo(chatId, message.from?.id, authorized);
      return;
    }

    if (!authorized) {
      if (this.isStartCommand(normalized)) {
        await this.sendChatIdInfo(chatId, message.from?.id, false);
        return;
      }

      // در چت خصوصی پیام عدم دسترسی می‌دهیم، اما در گروه‌های غیرمجاز سکوت می‌کنیم تا مزاحمت ایجاد نشود
      if (message.chat?.type === 'private') {
        await this.baleClient.sendMessage(
          chatId,
          '⛔ این چت دسترسی مدیریتی ندارد.\nبرای دریافت شناسه چت جهت ثبت در تنظیمات سرور، دستور /id را ارسال کنید.',
        );
      }
      return;
    }

    if (this.isStartCommand(normalized)) {
      await this.sendWelcomeMenu(chatId);
      return;
    }

    if (this.isHelpCommand(normalized)) {
      await this.baleClient.sendMessage(
        chatId,
        this.buildHelpText(),
        this.buildMainReplyKeyboard(),
      );
      return;
    }

    if (this.isReportMenuCommand(normalized)) {
      await this.baleClient.sendMessage(
        chatId,
        '📊 بازهٔ مورد نظر برای گزارش‌گیری را انتخاب کنید:',
        this.buildReportInlineKeyboard(),
      );
      return;
    }

    if (this.isWithdrawalsCommand(normalized)) {
      const text =
        await this.baleReportService.generatePendingWithdrawalsText();
      await this.baleClient.sendMessage(
        chatId,
        text,
        this.buildWithdrawalsInlineKeyboard(),
      );
      return;
    }

    const period = this.resolvePeriodFromText(normalized);
    if (period) {
      const reportText =
        await this.baleReportService.generateReportText(period);
      await this.baleClient.sendMessage(
        chatId,
        reportText,
        this.buildReportInlineKeyboard(period),
      );
    }
  }

  private async handleCallbackQuery(query: BaleCallbackQuery): Promise<void> {
    const chatId = query.message?.chat?.id ?? query.from?.id;
    const messageId = query.message?.message_id;
    const data = String(query.data ?? '').trim();

    if (!this.isAuthorized(chatId, query.from?.id)) {
      await this.baleClient.answerCallbackQuery(
        query.id,
        '⛔ شما دسترسی مدیریتی به این ربات ندارید.',
        true,
      );
      return;
    }

    if (data === BALE_CALLBACK_PREFIX.WITHDRAWALS) {
      await this.baleClient.answerCallbackQuery(
        query.id,
        'در حال دریافت صف برداشت‌ها...',
      );
      const text =
        await this.baleReportService.generatePendingWithdrawalsText();
      const markup = this.buildWithdrawalsInlineKeyboard();

      if (chatId !== undefined && messageId !== undefined) {
        const edited = await this.baleClient.editMessageText(
          chatId,
          messageId,
          text,
          markup,
        );
        if (edited) return;
      }

      if (chatId !== undefined) {
        await this.baleClient.sendMessage(chatId, text, markup);
      }
      return;
    }

    if (data.startsWith(BALE_CALLBACK_PREFIX.REPORT)) {
      const periodCandidate = data.slice(
        BALE_CALLBACK_PREFIX.REPORT.length,
      ) as BaleReportPeriod;

      if (!BALE_REPORT_PERIODS.includes(periodCandidate)) {
        await this.baleClient.answerCallbackQuery(
          query.id,
          'بازهٔ گزارش نامعتبر است.',
        );
        return;
      }

      await this.baleClient.answerCallbackQuery(
        query.id,
        'در حال تهیه گزارش...',
      );

      const reportText =
        await this.baleReportService.generateReportText(periodCandidate);
      const markup = this.buildReportInlineKeyboard(periodCandidate);

      if (chatId !== undefined && messageId !== undefined) {
        const edited = await this.baleClient.editMessageText(
          chatId,
          messageId,
          reportText,
          markup,
        );
        if (edited) return;
      }

      if (chatId !== undefined) {
        await this.baleClient.sendMessage(chatId, reportText, markup);
      }
    }
  }

  private async sendChatIdInfo(
    chatId: string | number,
    fromUserId: number | undefined,
    authorized: boolean,
  ): Promise<void> {
    const lines = [
      '🤖 ربات مدیریتی سامانه منشیم',
      '━━━━━━━━━━━━━━━━━━',
      `🆔 شناسه این چت (Chat ID): ${chatId}`,
      ...(fromUserId && String(fromUserId) !== String(chatId)
        ? [`👤 شناسه کاربری شما: ${fromUserId}`]
        : []),
      '',
      authorized
        ? '✅ این گفتگو در فهرست مدیران مجاز (BALE_CHAT_IDS) قرار دارد و آماده دریافت اعلان‌ها و گزارش‌ها است.'
        : '⚠️ این گفتگو هنوز در فهرست مدیران مجاز ثبت نشده است.\nبرای فعال‌سازی، شناسه بالا را در متغیر BALE_CHAT_IDS داخل فایل .env سرور قرار داده و سرویس بک‌اند را ری‌استارت کنید.',
    ];

    await this.baleClient.sendMessage(
      chatId,
      lines.join('\n'),
      authorized ? this.buildMainReplyKeyboard() : undefined,
    );
  }

  private async sendWelcomeMenu(chatId: string | number): Promise<void> {
    const welcomeLines = [
      '👋 خوش آمدید! ربات مدیریتی «منشیم» آماده است.',
      '━━━━━━━━━━━━━━━━━━',
      '🔔 اعلان‌های خودکار فعال:',
      '• تمامی پرداخت‌های موفق به همراه علت پرداخت (رزرو آنلاین، لینک بیعانه، خرید اشتراک، صفحه اختصاصی و شارژ کیف پول)',
      '• ثبت‌نام آرایشگر جدید و ویرایش پروفایل آرایشگران (جهت بررسی و تایید)',
      '• ثبت درخواست برداشت توسط آرایشگران',
      '',
      '📊 برای دریافت آمار لحظه‌ای، از دکمه‌های پایین صفحه یا دکمه‌های شیشه‌ای زیر استفاده کنید:',
    ];

    await this.baleClient.sendMessage(
      chatId,
      welcomeLines.join('\n'),
      this.buildMainReplyKeyboard(),
    );

    await this.baleClient.sendMessage(
      chatId,
      '📊 انتخاب سریع بازهٔ گزارش:',
      this.buildReportInlineKeyboard(),
    );
  }

  private buildHelpText(): string {
    return [
      'ℹ️ راهنمای دستورات ربات مدیریتی منشیم',
      '━━━━━━━━━━━━━━━━━━',
      '📊 دستورات گزارش‌گیری (بر اساس تقویم شمسی و وقت تهران):',
      '• /daily یا «گزارش روزانه» — آمار امروز',
      '• /yesterday یا «گزارش دیروز» — آمار دیروز',
      '• /weekly یا «گزارش هفتگی» — آمار هفته جاری (از شنبه)',
      '• /lastweek یا «هفته گذشته» — آمار هفته قبل',
      '• /monthly یا «گزارش ماهانه» — آمار ماه جاری شمسی',
      '• /lastmonth یا «ماه گذشته» — آمار ماه قبل شمسی',
      '• /yearly یا «گزارش سالانه» — آمار سال جاری شمسی',
      '• /lastyear یا «سال گذشته» — آمار سال قبل شمسی',
      '',
      '🏦 سایر دستورات:',
      '• /withdrawals یا «صف برداشت‌ها» — لیست برداشت‌های منتظر تسویه',
      '• /report — نمایش منوی شیشه‌ای گزارش‌ها',
      '• /id — نمایش شناسه چت (Chat ID)',
      '• /start — بازآوری کیبورد اصلی ربات',
    ].join('\n');
  }

  buildMainReplyKeyboard(): BaleReplyMarkup {
    return {
      keyboard: [
        [
          { text: BALE_BUTTONS.DAILY_REPORT },
          { text: BALE_BUTTONS.WEEKLY_REPORT },
        ],
        [
          { text: BALE_BUTTONS.MONTHLY_REPORT },
          { text: BALE_BUTTONS.YEARLY_REPORT },
        ],
        [
          { text: BALE_BUTTONS.PENDING_WITHDRAWALS },
          { text: BALE_BUTTONS.HELP },
        ],
      ],
      resize_keyboard: true,
    };
  }

  buildReportInlineKeyboard(activePeriod?: BaleReportPeriod): {
    inline_keyboard: BaleInlineKeyboardButton[][];
  } {
    const label = (period: BaleReportPeriod, text: string) =>
      activePeriod === period ? `• ${text} •` : text;

    const rows: BaleInlineKeyboardButton[][] = [
      [
        {
          text: label('daily', '📊 روزانه (امروز)'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}daily`,
        },
        {
          text: label('weekly', '📅 هفتگی'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}weekly`,
        },
      ],
      [
        {
          text: label('monthly', '🗓 ماهانه'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}monthly`,
        },
        {
          text: label('yearly', '📈 سالانه'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}yearly`,
        },
      ],
      [
        {
          text: label('yesterday', '⏪ دیروز'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}yesterday`,
        },
        {
          text: label('last_week', '⏪ هفته قبل'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}last_week`,
        },
      ],
      [
        {
          text: label('last_month', '⏪ ماه قبل'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}last_month`,
        },
        {
          text: label('last_year', '⏪ سال قبل'),
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}last_year`,
        },
      ],
    ];

    if (activePeriod) {
      rows.push([
        {
          text: '🔄 بروزرسانی همین گزارش',
          callback_data: `${BALE_CALLBACK_PREFIX.REPORT}${activePeriod}`,
        },
        {
          text: '🏦 صف برداشت‌ها',
          callback_data: BALE_CALLBACK_PREFIX.WITHDRAWALS,
        },
      ]);
    } else {
      rows.push([
        {
          text: '🏦 مشاهده صف برداشت‌های در انتظار',
          callback_data: BALE_CALLBACK_PREFIX.WITHDRAWALS,
        },
      ]);
    }

    return { inline_keyboard: rows };
  }

  private buildWithdrawalsInlineKeyboard(): {
    inline_keyboard: BaleInlineKeyboardButton[][];
  } {
    return {
      inline_keyboard: [
        [
          {
            text: '🔄 بروزرسانی صف برداشت‌ها',
            callback_data: BALE_CALLBACK_PREFIX.WITHDRAWALS,
          },
          {
            text: '📊 گزارش امروز',
            callback_data: `${BALE_CALLBACK_PREFIX.REPORT}daily`,
          },
        ],
      ],
    };
  }

  private normalizeCommand(raw: string): string {
    const cleaned = toEnDigits(raw)
      .replace(/\u200c/g, ' ') // تبدیل نیم‌فاصله به فاصله برای تطبیق راحت‌تر
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.startsWith('/')) {
      return cleaned.split('@')[0].toLowerCase();
    }

    return cleaned;
  }

  private isStartCommand(cmd: string): boolean {
    return ['/start', '/menu', 'منو', 'شروع'].includes(cmd);
  }

  private isChatIdCommand(cmd: string): boolean {
    return ['/id', '/chatid', 'شناسه', 'آیدی', 'ایدی', 'شناسه چت'].includes(
      cmd,
    );
  }

  private isHelpCommand(cmd: string): boolean {
    return (
      cmd === '/help' ||
      cmd === normalizeSpaces(BALE_BUTTONS.HELP) ||
      cmd === 'راهنما'
    );
  }

  private isReportMenuCommand(cmd: string): boolean {
    return ['/report', '/reports', 'گزارش', 'گزارش ها', 'گزارش گیری'].includes(
      cmd,
    );
  }

  private isWithdrawalsCommand(cmd: string): boolean {
    return (
      cmd === '/withdrawals' ||
      cmd === normalizeSpaces(BALE_BUTTONS.PENDING_WITHDRAWALS) ||
      ['صف برداشت ها', 'صف برداشت', 'برداشت ها', 'درخواست های برداشت'].includes(
        cmd,
      )
    );
  }

  private resolvePeriodFromText(cmd: string): BaleReportPeriod | null {
    if (
      cmd === '/daily' ||
      cmd === normalizeSpaces(BALE_BUTTONS.DAILY_REPORT) ||
      ['گزارش روزانه', 'روزانه', 'گزارش امروز', 'امروز'].includes(cmd)
    ) {
      return 'daily';
    }

    if (
      cmd === '/yesterday' ||
      ['گزارش دیروز', 'دیروز', 'روز قبل', 'روز گذشته'].includes(cmd)
    ) {
      return 'yesterday';
    }

    if (
      cmd === '/weekly' ||
      cmd === normalizeSpaces(BALE_BUTTONS.WEEKLY_REPORT) ||
      ['گزارش هفتگی', 'هفتگی', 'گزارش هفته', 'این هفته'].includes(cmd)
    ) {
      return 'weekly';
    }

    if (
      cmd === '/lastweek' ||
      cmd === '/last_week' ||
      ['گزارش هفته قبل', 'گزارش هفته گذشته', 'هفته قبل', 'هفته گذشته'].includes(
        cmd,
      )
    ) {
      return 'last_week';
    }

    if (
      cmd === '/monthly' ||
      cmd === normalizeSpaces(BALE_BUTTONS.MONTHLY_REPORT) ||
      ['گزارش ماهانه', 'ماهانه', 'گزارش ماه', 'این ماه'].includes(cmd)
    ) {
      return 'monthly';
    }

    if (
      cmd === '/lastmonth' ||
      cmd === '/last_month' ||
      ['گزارش ماه قبل', 'گزارش ماه گذشته', 'ماه قبل', 'ماه گذشته'].includes(cmd)
    ) {
      return 'last_month';
    }

    if (
      cmd === '/yearly' ||
      cmd === normalizeSpaces(BALE_BUTTONS.YEARLY_REPORT) ||
      ['گزارش سالانه', 'سالانه', 'گزارش سال', 'امسال'].includes(cmd)
    ) {
      return 'yearly';
    }

    if (
      cmd === '/lastyear' ||
      cmd === '/last_year' ||
      ['گزارش سال قبل', 'گزارش سال گذشته', 'سال قبل', 'سال گذشته'].includes(cmd)
    ) {
      return 'last_year';
    }

    return null;
  }
}

function normalizeSpaces(value: string): string {
  return value
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
