import type { Transaction } from '@/services/features/wallet/types';

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const ORDER_ID_PATTERN = /\b(?:BOOK|DEP|SUB|WAL|PAGE)-[A-Za-z0-9-]+\b/gi;
const TRACKING_SEGMENT_PATTERN =
  /\s*\|\s*(?:شناسه(?:ٔ)?\s*پیگیری(?:\s*واریز)?|رزرو|کد\s*پیگیری)\s*:?\s*[^|]+/gu;

function getFallbackReason(type: Transaction['type']): string {
  switch (type) {
    case 'INCOME':
      return 'درآمد رزرو نوبت';
    case 'DEPOSIT':
      return 'افزایش موجودی کیف پول';
    case 'WITHDRAWAL':
      return 'برداشت وجه';
    case 'REFUND':
      return 'بازپرداخت وجه';
    default:
      return 'تراکنش کیف پول';
  }
}

/**
 * تبدیل شرح خام تراکنش به دلیل خوانا و تمیز برای داشبورد آرایشگر
 * بدون نمایش شناسههای سیستمی (UUID، شماره سفارش درگاه یا کد پیگیری).
 */
export function formatTransactionReason(
  transaction: Pick<Transaction, 'type' | 'description'>,
): string {
  const raw = transaction.description?.trim() ?? '';
  if (!raw) {
    return getFallbackReason(transaction.type);
  }

  if (raw.startsWith('درآمد رزرو نوبت')) {
    return 'درآمد رزرو نوبت';
  }

  if (raw.startsWith('کسر کیف پول آرایشگر بابت لغو رزرو')) {
    return 'کسر بابت لغو رزرو';
  }

  if (raw.startsWith('بازپرداخت مشتری')) {
    return 'بازپرداخت لغو رزرو';
  }

  if (raw.includes('شارژ آنلاین کیف پول')) {
    return 'شارژ آنلاین کیف پول';
  }

  if (raw.includes('پاداش دعوت')) {
    return 'پاداش دعوت همکار';
  }

  if (raw === 'برگشت مبلغ برداشت ردشده') {
    return 'برگشت مبلغ برداشت ردشده';
  }

  const cleaned = raw
    .replace(TRACKING_SEGMENT_PATTERN, '')
    .replace(UUID_PATTERN, '')
    .replace(ORDER_ID_PATTERN, '')
    .replace(/\s*-\s*منشیم\s*$/u, '')
    .replace(/^برداشت به کارت\s+(.+?)\s*-\s*\d{4}(?=\s*\||$)/u, 'برداشت به کارت $1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[|-]\s*$/u, '')
    .trim();

  return cleaned || getFallbackReason(transaction.type);
}
