// components/booking/Step1Profile.tsx
import {
  ArrowRight,
  ChevronRight,
  ImageIcon,
  MapPin,
  Share2,
  Star,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Barber } from '@/services/features/barber/types';

interface Step1ProfileProps {
  barber: Barber;
  onStartBooking: () => void;
  onShare: () => void;
  onImageClick: (img: string) => void;
  onBack: () => void;
}

export const Step1Profile: React.FC<Step1ProfileProps> = ({
  barber,
  onStartBooking,
  onShare,
  onImageClick,
  onBack,
}) => {
  return (
    <div className="relative min-h-screen bg-gray-50 pb-24 overflow-hidden">
      {/* Header */}
      <div className="relative h-[280px] rounded-b-[40px] overflow-hidden shadow-2xl">
        <Image
          src={process.env.NEXT_PUBLIC_IMAGE_URL || '' + barber.image || ''}
          className="filter brightness-50"
          fill
          objectFit="cover"
          alt={barber.shopName}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20">
          <Button onClick={onBack} size="icon" variant="outline">
            <ChevronRight size={24} />
          </Button>
          <Button onClick={onShare} size="icon" variant="outline">
            <Share2 size={20} />
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-1 drop-shadow-md">
            {barber.shopName}
          </h1>
          <p className="text-gray-300 text-sm font-medium mb-3">
            {barber.name}
          </p>
          <div className="flex justify-center items-center gap-6 bg-white/10 backdrop-blur-md rounded-2xl py-2 px-6 mx-8 border border-white/10">
            <div className="text-center">
              <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                {barber.rating} <Star size={12} fill="currentColor" />
              </div>
              <span className="text-[10px] text-gray-300">امتیاز</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="text-center">
              <div className="text-white font-bold text-sm">
                {barber.reviewCount}
              </div>
              <span className="text-[10px] text-gray-300">نظر</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        {barber.portfolio && barber.portfolio.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <ImageIcon size={16} className="text-primary-600" /> نمونه کارها
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {barber.portfolio.map((img, idx) => (
                <div
                  key={idx}
                  className="min-w-[80px] w-[80px] aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
                  onClick={() => onImageClick(img)}
                >
                  <img
                    src={img}
                    className="w-full h-full object-cover"
                    alt={`نمونه کار ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {/* <h3 className="font-bold text-gray-800 text-sm">درباره آرایشگاه</h3>
          <p className="text-sm text-gray-600 leading-6 text-justify bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            {barber.bio}
          </p> */}
          <div className="flex items-start gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-gray-600 text-sm mt-3">
            <MapPin size={18} className="shrink-0 text-primary-600 mt-0.5" />
            <span>{barber.address}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-100">
        <Button onClick={onStartBooking} className="w-full" size="lg">
          رزرو نوبت
          <ArrowRight className="rotate-180" size={20} />
        </Button>
      </div>
    </div>
  );
};
