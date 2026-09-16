'use client';

import { ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getImageUploadError, IMAGE_ACCEPT } from '@/lib/image-upload';
import { useBarberSignupStore } from '@/store/useBarberSignupStore';

interface Step3Props {
  onSubmit: (data: any) => void;
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
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600 border border-purple-100 shadow-sm">
          <ImageIcon size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">نمونه کارها</h2>
        <p className="text-xs text-gray-500 mt-1">
          تصاویری از محیط کار یا نمونه کارهای خود اضافه کنید (حداکثر ۵ عکس برای
          شروع)
        </p>
        <p className="text-xs text-gray-400 mt-2">
          تعداد عکس‌ها: {portfolio.length}
        </p>
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
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition-opacity z-10"
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

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white bg-white/20 p-2 rounded-full z-[101] hover:bg-white/30 transition-colors"
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

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            مرحله قبل
          </Button>
          <Button type="button" onClick={handleNext}>
            مرحله بعد
          </Button>
        </div>
      </div>
    </div>
  );
}
