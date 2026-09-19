'use client';

import { ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import StepFooter from '@/components/pages/auth/barbaer/step-footer';
import { Button } from '@/components/ui/button';
import { getImageUploadError, IMAGE_ACCEPT } from '@/lib/image-upload';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step3Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function BarbaerStep3({ onSubmit }: Step3Props) {
  const { portfolio, prevStep, updateData } = useBarberSignupStore();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const removePortfolioImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newPortfolio = portfolio.filter((_, i) => i !== index);
    updateData({ portfolio: newPortfolio });
  };

  const handlePortfolioClick = () => {
    if (portfolio.length >= 5) {
      toast.warning('در ثبت نام اولیه حداکثر ۵ عکس مجاز است.');
      return;
    }
    portfolioInputRef.current?.click();
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePortfolioChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files) return;

    if (portfolio.length + files.length > 5) {
      toast.error('مجموع عکس‌ها نباید بیشتر از ۵ باشد.');
      e.target.value = '';
      return;
    }

    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const validationError = getImageUploadError(file);
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }
      const newImages = await Promise.all(fileArray.map(readFileAsDataURL));
      const updated = [...portfolio, ...newImages];
      updateData({ portfolio: updated });
      toast.success(`${files.length} تصویر با موفقیت اضافه شد.`);
    } catch (error) {
      console.error('❌ Error reading files:', error);
      toast.error('خطا در خواندن فایل‌ها');
    } finally {
      e.target.value = '';
    }
  };

  const handleNext = () => {
    onSubmit({ portfolio });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl px-4 py-3">
        <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
          حداکثر ۵ تصویر مجاز است و حجم هر تصویر باید حداکثر ۳ مگابایت باشد
          (فرمت‌های JPEG، PNG، GIF و WebP).
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500">
            تصاویر بارگذاری‌شده
          </h3>
          <span className="text-[11px] font-bold text-gray-400">
            {portfolio.length} از ۵
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {portfolio.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-gray-100 cursor-pointer bg-gray-100"
              onClick={() => setLightboxImage(img)}
            >
              <img
                src={img}
                alt={`نمونه کار ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={e => {
                  console.error('❌ Image load error:', img.slice(0, 50));
                  e.currentTarget.style.display = 'none';
                }}
              />
              <button
                onClick={e => removePortfolioImage(e, idx)}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity z-10 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {portfolio.length < 5 && (
            <div
              onClick={handlePortfolioClick}
              className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary-300 transition-colors bg-gray-50"
            >
              <Plus size={24} />
              <span className="text-[10px] mt-1 font-bold">افزودن</span>
              <span className="text-[9px] mt-0.5 text-gray-400/80 font-medium">
                حداکثر ۳ مگابایت
              </span>
            </div>
          )}
          <input
            type="file"
            ref={portfolioInputRef}
            onChange={handlePortfolioChange}
            className="hidden"
            accept={IMAGE_ACCEPT}
            multiple
          />
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white bg-white/20 p-2 rounded-full z-[101] hover:bg-white/30 transition-colors cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <div
            className="relative w-full max-w-3xl max-h-[80vh] rounded-lg shadow-2xl z-[101]"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="نمایش نمونه کار"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      <StepFooter
        onBack={prevStep}
        primary={
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 h-12 text-base font-bold shadow-md shadow-primary/20 cursor-pointer"
          >
            مرحله بعد
          </Button>
        }
      />
    </div>
  );
}
