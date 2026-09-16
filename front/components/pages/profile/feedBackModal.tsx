// components/profile/FeedbackModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({
  message: z.string().min(3, 'متن پیام حداقل ۳ کاراکتر باشد'),
});

type FormData = z.infer<typeof schema>;

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onOpenChange,
}) => {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { message: '' },
  });

  const { reset } = methods;

  const onSubmit = (data: FormData) => {
    // TODO: API call to send feedback
    toast.success('بازخورد شما با موفقیت ثبت شد.');
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="font-bold text-lg text-gray-900">
              ثبت بازخورد
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <DialogDescription className="text-xs text-gray-500">
            نظرات شما به بهبود خدمات ما کمک می‌کند.
          </DialogDescription>
        </DialogHeader>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFTextArea
            name="message"
            label="متن پیام"
            placeholder="متن پیام شما..."
            rows={4}
          />

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={handleClose}
            >
              انصراف
            </Button>
            <Button type="submit" className="flex-1">
              ارسال
            </Button>
          </div>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
