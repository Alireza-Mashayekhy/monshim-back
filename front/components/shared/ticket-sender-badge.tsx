import { Scissors, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TicketSenderRole } from '@/services/features/ticket/types';

/** برچسب متناسب با نقش فرستندهٔ تیکت برای لیبل گفتگو */
export const ticketSenderLabel = (
  role: TicketSenderRole | null | undefined,
): string => (role === 'barber' ? 'آرایشگر' : 'کاربر');

interface TicketSenderBadgeProps {
  role: TicketSenderRole | null | undefined;
  className?: string;
}

/**
 * بج «آرایشگر / کاربر» برای نمایش نوع فرستندهٔ تیکت در پنل ادمین.
 * اگر نقش نامشخص باشد (تیکت قدیمی یا کاربر حذف‌شده) چیزی رندر نمی‌شود.
 */
export default function TicketSenderBadge({
  role,
  className,
}: TicketSenderBadgeProps) {
  if (role !== 'barber' && role !== 'user') return null;

  const isBarber = role === 'barber';

  return (
    <span
      title={
        isBarber
          ? 'فرستندهٔ این تیکت آرایشگر است'
          : 'فرستندهٔ این تیکت کاربر عادی است'
      }
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
        isBarber ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-600',
        className,
      )}
    >
      {isBarber ? <Scissors size={10} /> : <UserRound size={10} />}
      {isBarber ? 'آرایشگر' : 'کاربر'}
    </span>
  );
}
