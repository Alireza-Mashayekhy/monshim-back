// components/dashboard/modals/ProfileEditModal.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import FormProvider from '@/components/form/form-provider';
import RHFInput from '@/components/form/rhf-input';
import RHFTextArea from '@/components/form/rhf-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getImageUploadError, IMAGE_ACCEPT } from '@/lib/image-upload';
import { DefaultImage } from '@/lib/utils';

const schema = z.object({
  shopName: z.string().min(1, 'نام فروشگاه الزامی است'),
  name: z.string().min(1, 'نام آرایشگر الزامی است'),
  city: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditModal({
  open,
  onOpenChange,
}: ProfileEditModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: '',
      name: '',
      city: '',
      address: '',
      bio: '',
    },
  });

  const { reset } = methods;

  useEffect(() => {
    if (true) {
      reset({
        shopName: '',
        name: '',
        city: '',
        address: '',
        bio: '',
      });
    }
  }, [reset, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = getImageUploadError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    // Saving profile changes is not implemented in this modal yet.
  };

  const onSubmit = (data: FormData) => {
    // TODO: API call to save profile changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="font-bold text-lg text-gray-800">
            ویرایش اطلاعات
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24">
            <img
              src={imagePreview || DefaultImage}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full shadow-lg"
            >
              <Upload size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={IMAGE_ACCEPT}
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <FormProvider
          methods={methods}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <RHFInput name="name" label="نام آرایشگر" />
          <RHFInput name="shopName" label="نام فروشگاه" />
          <RHFInput name="city" label="شهر" />
          <RHFTextArea name="address" label="آدرس" rows={3} />
          <RHFTextArea name="bio" label="بیوگرافی" rows={4} />

          <Button type="submit" className="w-full">
            {'ذخیره تغییرات'}
          </Button>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
