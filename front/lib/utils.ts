import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

export const getFullImageUrl = (
  path: string | null | undefined,
): string | null => {
  if (!path) return null;
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_IMAGE_URL || ''}${path}`;
};

export const formatPrice = (value: number | string): string => {
  if (value === null || value === undefined || value === '') return '۰';
  const strValue =
    typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  const num = parseFloat(strValue);
  if (isNaN(num)) return '۰';
  return Math.floor(num).toLocaleString('en-US');
};

export const getNext7Days = (): { date: string; label: string }[] => {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('fa-IR', { weekday: 'short' });
    days.push({ date: dateStr, label });
  }
  return days;
};

export const DefaultImage = '/placeholder.webp';

export const formatNumberInput = (value: string) => {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '،');
};

export const unformatNumberInput = (value: string) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};
