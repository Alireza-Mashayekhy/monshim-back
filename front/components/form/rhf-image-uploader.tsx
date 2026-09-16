// components/form/rhf-image-uploader.tsx
import { Camera, X } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FieldValues, Path, PathValue, UseFormSetValue } from 'react-hook-form';
import { toast } from 'sonner';

import {
  getImageUploadError,
  IMAGE_DROPZONE_ACCEPT,
  IMAGE_FORMAT_ERROR,
  IMAGE_SIZE_ERROR,
  MAX_IMAGE_SIZE,
} from '@/lib/image-upload';
import { cn } from '@/lib/utils';

interface RHFImageUploaderProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  setValue: UseFormSetValue<T>;
  error?: { message?: string };
  defaultValue?: string | null;
  aspectRatio?: number;
  className?: string;
}

export function RHFImageUploader<T extends FieldValues>({
  name,
  label,
  setValue,
  error,
  defaultValue = null,
  aspectRatio,
  className,
}: RHFImageUploaderProps<T>) {
  // مقدار اولیه preview همان defaultValue است
  const [preview, setPreview] = useState<string | null>(defaultValue);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      const validationError = getImageUploadError(selectedFile);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
      setValue(name, selectedFile as PathValue<T, Path<T>>, {
        shouldValidate: true,
      });
    },
    [name, setValue],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: IMAGE_DROPZONE_ACCEPT,
    maxSize: MAX_IMAGE_SIZE,
    onDropRejected: rejections => {
      toast.error(
        rejections.some(({ errors }) =>
          errors.some(error => error.code === 'file-too-large'),
        )
          ? IMAGE_SIZE_ERROR
          : IMAGE_FORMAT_ERROR,
      );
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setValue(name, undefined as any, { shouldValidate: true });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-primary-300 transition-all relative overflow-hidden group bg-gray-50',
          error?.message && 'border-red-500 dark:border-red-500',
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative h-full w-full">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              style={{ aspectRatio: aspectRatio ? aspectRatio : 'auto' }}
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Camera size={24} className="text-primary-600 mb-1" />
            <span className="text-[10px] font-bold">آپلود عکس</span>
          </div>
        )}
      </div>

      {error?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
    </div>
  );
}
