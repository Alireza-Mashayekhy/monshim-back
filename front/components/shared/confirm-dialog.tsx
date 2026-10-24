'use client';

import type { ReactNode } from 'react';

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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** متن دکمه تأیید؛ پیش‌فرض «تأیید» */
  confirmLabel?: string;
  /** متن دکمه تأیید هنگام انجام عملیات؛ پیش‌فرض «در حال انجام...» */
  pendingLabel?: string;
  /** متن دکمه انصراف؛ پیش‌فرض «انصراف» */
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** در حال انجام بودن عملیات تأیید (دکمه‌ها غیرفعال می‌شوند) */
  isPending?: boolean;
  /** نمایش دکمه تأیید با استایل مخرب (حذف و...)؛ پیش‌فرض فعال */
  destructive?: boolean;
}

/**
 * دیالوگ تأیید مشترک بر پایه AlertDialog — جایگزین `window.confirm` مرورگر.
 *
 * تا وقتی عملیات تأیید تمام نشده دیالوگ باز می‌ماند؛ اگر عملیات خطا بدهد هم
 * دیالوگ بسته نمی‌شود تا کاربر بتواند دوباره تلاش کند. در صورت موفقیت،
 * دیالوگ به‌صورت خودکار بسته می‌شود.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأیید',
  pendingLabel = 'در حال انجام...',
  cancelLabel = 'انصراف',
  onConfirm,
  isPending = false,
  destructive = true,
}: ConfirmDialogProps) {
  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // جلوگیری از بسته‌شدن خودکار دیالوگ توسط AlertDialogAction؛
    // فقط بعد از موفقیت عملیات خودمان آن را می‌بندیم.
    event.preventDefault();
    if (isPending) return;

    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // خطا در هوک/کالبک نمایش داده می‌شود؛ دیالوگ برای تلاش مجدد باز می‌ماند.
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
