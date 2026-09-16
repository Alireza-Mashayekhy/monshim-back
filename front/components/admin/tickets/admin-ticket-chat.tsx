'use client';

import {
  ChevronRight,
  Loader2,
  Lock,
  MoreVertical,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { MessageBubble } from '@/components/shared/message-bubble';
import { TicketStatusBadge } from '@/components/shared/ticket-badges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { TICKET_DEPARTMENT_LABEL } from '@/constants/ticket';
import { formatPersianDate } from '@/lib/date-utils';
import {
  useAdminTicket,
  useCloseAdminTicket,
  useSendAdminTicketMessage,
} from '@/services/features/ticket/hooks';

interface AdminTicketChatProps {
  ticketId: string;
  /** در حالت موبایل برای بازگشت به لیست استفاده می‌شود */
  onBack?: () => void;
}

/** دریافت خودکار پیام‌های جدید کاربران هر ۲۰ ثانیه */
const REFETCH_INTERVAL = 20_000;

export function AdminTicketChat({ ticketId, onBack }: AdminTicketChatProps) {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAdminTicket(ticketId, REFETCH_INTERVAL);

  const ticket = data?.data;
  const messages = ticket?.messages ?? [];
  const isClosed = ticket?.status === 'CLOSED';

  const [text, setText] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendAdminTicketMessage();
  const closeTicket = useCloseAdminTicket();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, ticketId]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sendMessage.isPending) return;

    setText('');
    try {
      await sendMessage.mutateAsync({ id: ticketId, dto: { message: value } });
    } catch {
      setText(value);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleClose = async () => {
    try {
      await closeTicket.mutateAsync(ticketId);
      setCloseOpen(false);
    } catch {
      // خطا در هوک با toast نمایش داده می‌شود
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* هدر */}
      <div className="border-b border-gray-200 px-3 py-3 flex items-center gap-2 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت به لیست"
            className="lg:hidden text-gray-600 hover:text-gray-900 p-1"
          >
            <ChevronRight size={20} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-800 truncate">
            {ticket?.subject ?? 'گفتگو'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {ticket && <TicketStatusBadge status={ticket.status} />}
            {ticket && (
              <>
                <span className="text-[10px] text-gray-400">
                  {TICKET_DEPARTMENT_LABEL[ticket.department]}
                </span>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="text-[10px] text-gray-400">
                  کاربر {ticket.userId.toLocaleString('fa-IR')}
                </span>
              </>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-gray-400"
          onClick={() => refetch()}
          aria-label="به‌روزرسانی"
        >
          <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
        </Button>

        {!isClosed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-gray-500"
                aria-label="عملیات"
              >
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setCloseOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                بستن تیکت
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* پیام‌ها */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <Skeleton
                  className={`h-14 rounded-2xl ${index % 2 === 0 ? 'w-2/3' : 'w-3/4'}`}
                />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-gray-500">
              {(error as any)?.response?.data?.message ||
                'خطا در دریافت گفتگو. لطفاً دوباره تلاش کنید.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400">پیامی وجود ندارد.</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const showDate =
                index === 0 ||
                formatPersianDate(previous?.createdAt) !==
                  formatPersianDate(message.createdAt);

              return (
                <Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
                        {formatPersianDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="mb-3">
                    <MessageBubble
                      message={message}
                      isOwn={message.senderRole === 'ADMIN'}
                      ownLabel="پشتیبانی"
                      otherLabel="کاربر"
                    />
                  </div>
                </Fragment>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ارسال پاسخ */}
      <div className="border-t border-gray-200 px-3 py-2.5 shrink-0">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-1.5">
            <Lock size={14} />
            این تیکت بسته شده است و امکان ارسال پاسخ وجود ندارد
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="پاسخ خود را بنویسید..."
              className="min-h-10 max-h-40 rounded-2xl resize-none bg-gray-50 border-gray-200"
            />
            <Button
              type="button"
              size="icon-lg"
              onClick={handleSend}
              disabled={!text.trim() || sendMessage.isPending}
              aria-label="ارسال پاسخ"
              className="shrink-0 size-10 rounded-full"
            >
              {sendMessage.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className="-scale-x-100" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* تایید بستن تیکت */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>بستن تیکت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از بستن این تیکت مطمئن هستید؟ پس از بستن، امکان ارسال پیام
              وجود نخواهد داشت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={closeTicket.isPending}
              className="bg-primary-600 text-white hover:bg-primary-700"
            >
              {closeTicket.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'بستن تیکت'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
