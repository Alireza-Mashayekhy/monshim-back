import { Headphones, Loader2, User } from 'lucide-react';

import { formatPersianTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { TicketMessage } from '@/services/features/ticket/types';

interface MessageBubbleProps {
  message: TicketMessage;
  /** آیا فرستندهٔ پیام، کاربر جاری (صاحب صفحه) است؟ */
  isOwn: boolean;
  /** برچسب فرستنده برای پیام‌های خودِ کاربر جاری */
  ownLabel?: string;
  /** برچسب فرستنده برای پیام‌های طرف مقابل */
  otherLabel?: string;
}

export function MessageBubble({
  message,
  isOwn,
  ownLabel = 'شما',
  otherLabel = 'پشتیبانی',
}: MessageBubbleProps) {
  const isPending = message.id.startsWith('optimistic-');

  return (
    // در راست‌چین: justify-start => سمت راست (پیام‌های خودِ کاربر جاری)
    <div className={cn('flex w-full', isOwn ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[85%]',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {/* نام فرستنده */}
        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-1">
          {isOwn ? (
            <>
              {ownLabel}
              <User size={10} />
            </>
          ) : (
            <>
              {otherLabel}
              <Headphones size={10} />
            </>
          )}
        </span>

        {/* حباب پیام */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap break-words shadow-sm',
            isOwn
              ? 'bg-primary-600 text-white rounded-tl-2xl rounded-tr-sm'
              : 'bg-white text-gray-800 border border-gray-100 rounded-tr-2xl rounded-tl-sm',
            isPending && 'opacity-60',
          )}
        >
          {message.message}
        </div>

        {/* زمان */}
        <span className="flex items-center gap-1 text-[10px] text-gray-400 px-1">
          {isPending ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            formatPersianTime(message.createdAt)
          )}
        </span>
      </div>
    </div>
  );
}
