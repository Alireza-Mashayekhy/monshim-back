import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

import {
  BALE_HTTP_TIMEOUT_MS,
  BALE_MAX_MESSAGE_LENGTH,
  DEFAULT_BALE_API_BASE_URL,
  DEFAULT_BALE_POLL_INTERVAL_MS,
} from './bale.constants';

export interface BaleInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface BaleReplyKeyboardButton {
  text: string;
}

export type BaleReplyMarkup =
  | {
      inline_keyboard: BaleInlineKeyboardButton[][];
    }
  | {
      keyboard: BaleReplyKeyboardButton[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | {
      remove_keyboard: true;
    };

export interface BaleUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface BaleChat {
  id: number | string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface BaleMessage {
  message_id: number;
  from?: BaleUser;
  chat: BaleChat;
  date?: number;
  text?: string;
}

export interface BaleCallbackQuery {
  id: string;
  from: BaleUser;
  message?: BaleMessage;
  data?: string;
}

export interface BaleUpdate {
  update_id: number;
  message?: BaleMessage;
  edited_message?: BaleMessage;
  callback_query?: BaleCallbackQuery;
}

interface BaleApiResponse<T = unknown> {
  ok?: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

@Injectable()
export class BaleClientService {
  private readonly logger = new Logger(BaleClientService.name);
  private warnedMissingChats = false;

  constructor(private readonly configService: ConfigService) {}

  private readEnv(key: string): string {
    const fromConfig = this.configService.get<string>(key);
    return String(fromConfig ?? process.env[key] ?? '').trim();
  }

  getBotToken(): string {
    return this.readEnv('BALE_BOT_TOKEN').replace(/^['"]|['"]$/g, '');
  }

  getBaseUrl(): string {
    const raw = this.readEnv('BALE_API_BASE_URL') || DEFAULT_BALE_API_BASE_URL;
    return raw.replace(/\/+$/, '');
  }

  isEnabled(): boolean {
    const enabledRaw = this.readEnv('BALE_ENABLED').toLowerCase();
    if (enabledRaw === 'false' || enabledRaw === '0') {
      return false;
    }
    return Boolean(this.getBotToken());
  }

  /**
   * فهرست شناسه‌های چت مجاز ادمین/گروه (پشتیبانی هم‌زمان از BALE_CHAT_IDS و BALE_CHAT_ID).
   * مقادیر می‌توانند با ویرگول، نقطه‌ویرگول یا فاصله جدا شوند.
   */
  getAdminChatIds(): string[] {
    const combined = [
      this.readEnv('BALE_CHAT_IDS'),
      this.readEnv('BALE_CHAT_ID'),
    ]
      .filter(Boolean)
      .join(',');

    if (!combined) return [];

    const ids = combined
      .replace(/['"]/g, '')
      .split(/[,;\s]+/)
      .map(id => id.trim())
      .filter(Boolean);

    return [...new Set(ids)];
  }

  isAuthorizedChat(chatId: string | number | null | undefined): boolean {
    if (chatId === null || chatId === undefined) return false;
    const normalized = String(chatId).trim();
    if (!normalized) return false;

    return this.getAdminChatIds().includes(normalized);
  }

  getMode(): 'polling' | 'webhook' {
    const explicit = this.readEnv('BALE_MODE').toLowerCase();
    if (explicit === 'webhook') return 'webhook';
    if (explicit === 'polling') return 'polling';

    return this.getWebhookBaseUrl() ? 'webhook' : 'polling';
  }

  getWebhookBaseUrl(): string {
    return this.readEnv('BALE_WEBHOOK_URL').replace(/\/+$/, '');
  }

  /**
   * توکن امنیتی مسیر وبهوک.
   * اگر صریح تنظیم نشده باشد، به‌صورت قطعی از HMAC توکن ربات مشتق می‌شود
   * تا مسیر وبهوک همیشه در برابر درخواست‌های جعلی محافظت شود.
   */
  getWebhookSecret(): string {
    const explicit = this.readEnv('BALE_WEBHOOK_SECRET');
    if (explicit) return explicit;

    const token = this.getBotToken();
    if (!token) return '';

    return createHmac('sha256', token)
      .update('monshim-bale-webhook-v1')
      .digest('hex')
      .slice(0, 32);
  }

  verifyWebhookSecret(providedSecret?: string | null): boolean {
    const expected = this.getWebhookSecret();
    if (!expected || !providedSecret) return false;

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(String(providedSecret).trim(), 'utf8');
    if (expectedBuf.length !== providedBuf.length) return false;

    return timingSafeEqual(expectedBuf, providedBuf);
  }

  getPollIntervalMs(): number {
    const configured = Number(this.readEnv('BALE_POLL_INTERVAL_MS'));
    if (Number.isFinite(configured) && configured >= 1_000) {
      return Math.min(configured, 60_000);
    }
    return DEFAULT_BALE_POLL_INTERVAL_MS;
  }

  /** حذف توکن ربات از پیام خطا تا هیچ‌گاه در لاگ سرور یا Sentry افشا نشود */
  private sanitizeLogMessage(text: string): string {
    const token = this.getBotToken();
    if (!token) return text;
    return text.split(token).join('[REDACTED_BALE_TOKEN]');
  }

  private buildMethodUrl(method: string): string {
    return `${this.getBaseUrl()}/bot${this.getBotToken()}/${method}`;
  }

  private splitLongText(text: string): string[] {
    const normalized = String(text ?? '').trim();
    if (!normalized) return [];
    if (normalized.length <= BALE_MAX_MESSAGE_LENGTH) return [normalized];

    const chunks: string[] = [];
    let remaining = normalized;

    while (remaining.length > BALE_MAX_MESSAGE_LENGTH) {
      let splitAt = remaining.lastIndexOf('\n', BALE_MAX_MESSAGE_LENGTH);
      if (splitAt < BALE_MAX_MESSAGE_LENGTH / 2) {
        splitAt = BALE_MAX_MESSAGE_LENGTH;
      }
      chunks.push(remaining.slice(0, splitAt).trimEnd());
      remaining = remaining.slice(splitAt).trimStart();
    }

    if (remaining) {
      chunks.push(remaining);
    }

    return chunks;
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: BaleReplyMarkup,
  ): Promise<BaleMessage | null> {
    if (!this.isEnabled()) return null;

    const chunks = this.splitLongText(text);
    if (!chunks.length) return null;

    let lastSent: BaleMessage | null = null;

    for (let index = 0; index < chunks.length; index += 1) {
      const isLastChunk = index === chunks.length - 1;
      const payload: Record<string, unknown> = {
        chat_id: String(chatId).trim(),
        text: chunks[index],
      };

      if (isLastChunk && replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const result = await this.callApi<BaleMessage>('sendMessage', payload);
      if (result) {
        lastSent = result;
      }
    }

    return lastSent;
  }

  /** ارسال اعلان به تمام چت‌های ادمین ثبت‌شده در تنظیمات محیطی */
  async broadcastToAdmins(
    text: string,
    replyMarkup?: BaleReplyMarkup,
  ): Promise<number> {
    if (!this.isEnabled()) return 0;

    const chatIds = this.getAdminChatIds();
    if (!chatIds.length) {
      if (!this.warnedMissingChats) {
        this.warnedMissingChats = true;
        this.logger.warn(
          'BALE_BOT_TOKEN تنظیم شده اما BALE_CHAT_IDS خالی است؛ برای دریافت اعلان‌ها دستور /id را در ربات بله بفرستید و شناسه را در .env قرار دهید.',
        );
      }
      return 0;
    }

    const results = await Promise.allSettled(
      chatIds.map(chatId => this.sendMessage(chatId, text, replyMarkup)),
    );

    return results.filter(
      item => item.status === 'fulfilled' && Boolean(item.value),
    ).length;
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: { inline_keyboard: BaleInlineKeyboardButton[][] },
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;

    const clipped =
      text.length > BALE_MAX_MESSAGE_LENGTH
        ? `${text.slice(0, BALE_MAX_MESSAGE_LENGTH - 1)}…`
        : text;

    try {
      const response = await axios.post<BaleApiResponse<BaleMessage | boolean>>(
        this.buildMethodUrl('editMessageText'),
        {
          chat_id: String(chatId).trim(),
          message_id: messageId,
          text: clipped,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        },
        { timeout: BALE_HTTP_TIMEOUT_MS },
      );

      return Boolean(response.data?.ok);
    } catch (error) {
      if (error instanceof AxiosError) {
        const description = String(
          (error.response?.data as BaleApiResponse | undefined)?.description ??
            '',
        ).toLowerCase();

        // اگر متن پیام تغییری نکرده باشد، بله خطای 400 برمی‌گرداند که خطای واقعی نیست
        if (description.includes('message is not modified')) {
          return true;
        }
      }

      this.logApiError('editMessageText', error);
      return false;
    }
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
  ): Promise<void> {
    if (!this.isEnabled() || !callbackQueryId) return;

    await this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
      ...(showAlert ? { show_alert: true } : {}),
    });
  }

  async getUpdates(
    offset?: number,
    limit = 50,
    timeoutSeconds = 5,
  ): Promise<{ ok: boolean; conflict?: boolean; updates: BaleUpdate[] }> {
    if (!this.isEnabled()) {
      return { ok: false, updates: [] };
    }

    try {
      const response = await axios.post<BaleApiResponse<BaleUpdate[]>>(
        this.buildMethodUrl('getUpdates'),
        {
          ...(offset !== undefined ? { offset } : {}),
          limit,
          timeout: timeoutSeconds,
        },
        {
          timeout: Math.max(BALE_HTTP_TIMEOUT_MS, (timeoutSeconds + 10) * 1000),
        },
      );

      if (response.data?.ok && Array.isArray(response.data.result)) {
        return { ok: true, updates: response.data.result };
      }

      return { ok: false, updates: [] };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        return { ok: false, conflict: true, updates: [] };
      }
      this.logApiError('getUpdates', error);
      return { ok: false, updates: [] };
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const result = await this.callApi<boolean>('setWebhook', { url });
    return Boolean(result);
  }

  async deleteWebhook(): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const result = await this.callApi<boolean>('deleteWebhook', {});
    return Boolean(result);
  }

  async getMe(): Promise<BaleUser | null> {
    if (!this.isEnabled()) return null;
    return this.callApi<BaleUser>('getMe', {});
  }

  private async callApi<T>(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<T | null> {
    try {
      const response = await axios.post<BaleApiResponse<T>>(
        this.buildMethodUrl(method),
        payload,
        { timeout: BALE_HTTP_TIMEOUT_MS },
      );

      if (!response.data?.ok) {
        this.logger.warn(
          this.sanitizeLogMessage(
            `Bale API (${method}) rejected request: ${response.data?.description ?? 'unknown error'}`,
          ),
        );
        return null;
      }

      return (response.data.result ?? true) as T;
    } catch (error) {
      this.logApiError(method, error);
      return null;
    }
  }

  private logApiError(method: string, error: unknown): void {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 'network';
      const body = error.response?.data as BaleApiResponse | undefined;
      const desc = body?.description ?? error.message;
      this.logger.warn(
        this.sanitizeLogMessage(
          `خطا در ارتباط با ربات بله (${method}, status=${status}): ${desc}`,
        ),
      );
      return;
    }

    this.logger.warn(
      this.sanitizeLogMessage(
        `خطای غیرمنتظره در ربات بله (${method}): ${String(error)}`,
      ),
    );
  }
}
