'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFSelect from '@/components/form/rhf-select';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TICKET_DEPARTMENT_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
} from '@/constants/ticket';
import { useCreateTicket } from '@/services/features/ticket/hooks';

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** بعد از ایجاد موفق، شناسهٔ تیکت جدید برگردانده می‌شود */
  onCreated?: (ticketId: string) => void;
}

const schema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, 'موضوع تیکت حداقل ۳ کاراکتر باشد')
    .max(200, 'موضوع تیکت حداکثر ۲۰۰ کاراکتر باشد'),
  message: z
    .string()
    .trim()
    .min(3, 'متن پیام حداقل ۳ کاراکتر باشد')
    .max(5000, 'متن پیام حداکثر ۵۰۰۰ کاراکتر باشد'),
  department: z.enum([
    'GENERAL',
    'PAYMENT',
    'TECHNICAL',
    'COMPLAINT',
    'SUGGESTION',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
});

type FormValues = z.infer<typeof schema>;

export function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: NewTicketDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      message: '',
      department: 'GENERAL',
      priority: 'NORMAL',
    },
  });

  const { reset } = methods;
  const createTicket = useCreateTicket();

  const handleClose = () => {
    if (createTicket.isPending) return;
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await createTicket.mutateAsync(values);
      reset();
      onOpenChange(false);
      onCreated?.(response?.data?.id);
    } catch {
      // خطا در هوک با toast نمایش داده می‌شود
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl p-5 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start gap-2">
            <div>
              <DialogTitle className="font-bold text-lg text-gray-900">
                تیکت جدید
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1">
                مشکل یا سؤال خود را بنویسید تا پشتیبانی در اسرع وقت پاسخ دهد.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="بستن"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4 mt-2"
        >
          <RHFInput
            name="subject"
            label="موضوع تیکت"
            placeholder="مثلاً: مشکل در پرداخت رزرو"
            isRequired
          />

          <div className="grid grid-cols-2 gap-3">
            <RHFSelect
              name="department"
              label="دپارتمان"
              placeholder="انتخاب دپارتمان"
              items={TICKET_DEPARTMENT_OPTIONS}
            />
            <RHFSelect
              name="priority"
              label="اولویت"
              placeholder="انتخاب اولویت"
              items={TICKET_PRIORITY_OPTIONS}
            />
          </div>

          <RHFTextArea
            name="message"
            label="متن پیام"
            placeholder="مشکل خود را به‌طور کامل توضیح دهید..."
            rows={5}
          />

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={createTicket.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createTicket.isPending}
            >
              {createTicket.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'ارسال تیکت'
              )}
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
