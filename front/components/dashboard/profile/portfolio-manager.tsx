'use client';

import { ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import AppCard from '@/components/shared/app-card';
import { Button } from '@/components/ui/button';
import {
  getImageUploadError,
  IMAGE_ACCEPT,
  MAX_PORTFOLIO_IMAGES,
} from '@/lib/image-upload';
import { getFullImageUrl, toPersianDigits } from '@/lib/utils';
import { useUpdateBarberPortfolio } from '@/services/features/barber/hooks';

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

interface PortfolioManagerProps {
  images?: string[] | null;
}

const EMPTY_PORTFOLIO_IMAGES: string[] = [];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PortfolioManager({
  images = EMPTY_PORTFOLIO_IMAGES,
}: PortfolioManagerProps) {
  const currentImages = images ?? EMPTY_PORTFOLIO_IMAGES;
  const [savedImages, setSavedImages] = useState(currentImages);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateBarberPortfolio();

  const startEditing = () => {
    setSavedImages(currentImages);
    setPendingImages([]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSavedImages(currentImages);
    setPendingImages([]);
    setIsEditing(false);
  };

  const handleAddFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';

    const available =
      MAX_PORTFOLIO_IMAGES - savedImages.length - pendingImages.length;
    if (available <= 0) {
      toast.error(
        `حداکثر ${toPersianDigits(MAX_PORTFOLIO_IMAGES)} نمونه‌کار مجاز است.`,
      );
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      const validationError = getImageUploadError(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > available) {
      toast.warning(
        `در هر بار حداکثر ${toPersianDigits(available)} عکس دیگر می‌توانید اضافه کنید.`,
      );
    }

    const filesToAdd = validFiles.slice(0, available);
    try {
      const newImages = await Promise.all(
        filesToAdd.map(async file => ({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          preview: await fileToDataUrl(file),
        })),
      );
      setPendingImages(current =>
        [...current, ...newImages].slice(
          0,
          MAX_PORTFOLIO_IMAGES - savedImages.length,
        ),
      );
    } catch {
      toast.error('پیش‌نمایش عکس‌ها بارگذاری نشد. دوباره تلاش کنید.');
    }
  };

  const saveChanges = async () => {
    const response = await updateMutation
      .mutateAsync({
        files: pendingImages.map(image => image.file),
        existingImages: savedImages,
      })
      .catch(() => null);

    if (!response) return;

    setSavedImages(response.data.portfolioImages ?? savedImages);
    setPendingImages([]);
    setIsEditing(false);
  };

  const displayedImages = [
    ...savedImages.map((src, index) => ({
      id: `saved-${src}-${index}`,
      src: getFullImageUrl(src) ?? src,
      isSaved: true,
      savedIndex: index,
    })),
    ...pendingImages.map(image => ({
      id: image.id,
      src: image.preview,
      isSaved: false,
      savedIndex: -1,
    })),
  ];

  return (
    <AppCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ImagePlus size={18} className="text-primary-600" />
            نمونه‌کارها و عکس‌های رزومه
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            عکس‌های نمونه‌کار خود را نمایش دهید؛ حداکثر ۵ عکس با حجم هرکدام تا ۳
            مگابایت.
          </p>
        </div>

        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 self-start"
            onClick={startEditing}
          >
            <Pencil size={14} />
            ویرایش عکس‌ها
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={saveChanges}
              loading={updateMutation.isPending}
              className="gap-1"
            >
              <Save size={14} />
              ذخیره
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={updateMutation.isPending}
              className="gap-1"
            >
              <X size={14} />
              انصراف
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {toPersianDigits(displayedImages.length)} از{' '}
          {toPersianDigits(MAX_PORTFOLIO_IMAGES)} عکس
        </span>
        {isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={
              updateMutation.isPending ||
              displayedImages.length >= MAX_PORTFOLIO_IMAGES
            }
            className="gap-1"
          >
            <Plus size={14} />
            افزودن عکس
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={handleAddFiles}
      />

      {displayedImages.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {displayedImages.map((image, index) => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
            >
              <Image
                src={image.src}
                alt={`نمونه‌کار ${toPersianDigits(index + 1)}`}
                fill
                unoptimized
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                className="object-cover"
              />
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    if (image.isSaved) {
                      setSavedImages(current =>
                        current.filter(
                          (_, currentIndex) =>
                            currentIndex !== image.savedIndex,
                        ),
                      );
                    } else {
                      setPendingImages(current =>
                        current.filter(pending => pending.id !== image.id),
                      );
                    }
                  }}
                  disabled={updateMutation.isPending}
                  aria-label="حذف عکس نمونه‌کار"
                  className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          هنوز عکسی برای رزومه ثبت نشده است.
          {isEditing && ' از دکمهٔ افزودن عکس استفاده کنید.'}
        </div>
      )}
    </AppCard>
  );
}
