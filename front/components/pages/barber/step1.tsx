// components/booking/Step1Profile.tsx
import { Check, Clock, Heart, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { BackButton } from '@/components/shared/back-button';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import type { ApiListResponse } from '@/services/api/types';
import type {
  Barber,
  BarberReview,
  Service,
} from '@/services/features/barber/types';

import { ReviewsSection } from './reviews-section';

interface Step1ProfileProps {
  barber: Barber;
  selectedServiceIds: string[];
  onToggleService: (id: string) => void;
  onContinue: () => void;
  onImageClick: (img: string) => void;
  initialReviews?: ApiListResponse<BarberReview> | null;
}

type Tab = 'services' | 'about' | 'reviews';

const IMG_BASE = process.env.NEXT_PUBLIC_IMAGE_URL || '';

function toFa(s: string) {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(s).replace(/\d/g, d => map[Number(d)]);
}

function getImageUrl(path?: string | null) {
  if (!path) return '/placeholder.webp';
  if (/^https?:\/\//i.test(path)) return path;
  const base = IMG_BASE.replace(/\/+$/, '');
  const imagePath = path.replace(/^\/+/, '');
  return base ? `${base}/${imagePath}` : `/${imagePath}`;
}

export const Step1Profile: React.FC<Step1ProfileProps> = ({
  barber,
  selectedServiceIds,
  onToggleService,
  onContinue,
  onImageClick,
  initialReviews,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [favorited, setFavorited] = useState(false);

  const selectedCount = selectedServiceIds.length;
  const hasSelection = selectedCount > 0;

  const reviewCount = barber.reviewCount ?? 0;
  const ratingValue = Number(barber.rating ?? 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'services', label: 'خدمات' },
    { key: 'about', label: 'درباره ما' },
    { key: 'reviews', label: `نظرات (${toFa(String(reviewCount))})` },
  ];

  return (
    <div className="relative min-h-screen pb-36 overflow-hidden">
      {/* Hero Image */}
      <div className="fixed top-0 h-[340px] w-full">
        <Image
          src={getImageUrl(barber.profileImage)}
          fill
          sizes="100vw"
          className="object-cover"
          alt={`لوگوی برند سالن ${barber.salonName}`}
          priority
        />
        {/* Top action buttons */}
        <div className="absolute top-4 left-0 right-0 px-5 flex justify-between items-center z-20">
          <BackButton />
          <Button
            onClick={() => setFavorited(v => !v)}
            aria-label="علاقه‌مندی"
            size="icon"
            variant="outline"
            className="bg-white"
          >
            <Heart
              size={20}
              className={
                favorited ? 'fill-red-500 text-red-500' : 'text-gray-700'
              }
            />
          </Button>
        </div>
      </div>

      {/* Curved white sheet */}
      <div className="relative mt-[320px] bg-primary-3 rounded-t-[32px] px-5 pt-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.15)]">
        {/* Header row: badge + shop name */}
        <div className="flex justify-between items-center">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-black text-gray-900 leading-tight">
              {barber.salonName}
            </h1>
          </div>
          {/* Rating */}
          <div className="flex items-center justify-end gap-2 text-gray-600">
            <Star size={18} className="fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-gray-800">
              {reviewCount > 0 ? toFa(ratingValue.toFixed(1)) : 'بدون امتیاز'}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 mt-3 text-gray-500 text-sm">
          <MapPin size={16} className="text-primary" />
          <span>
            {barber.address}
            {barber.city?.name ? ` • ${barber.city?.name}` : ''}
          </span>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="اطلاعات آرایشگاه"
          className="mt-6 border-b border-gray-200 flex items-end justify-between gap-2"
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`barber-tab-${tab.key}`}
              aria-controls={`barber-panel-${tab.key}`}
              aria-selected={activeTab === tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 px-2 text-center flex-1 text-[15px] font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab panels stay in the server HTML; the selected tab controls visibility. */}
        <div className="pt-5">
          <section
            role="tabpanel"
            id="barber-panel-services"
            aria-labelledby="barber-tab-services"
            hidden={activeTab !== 'services'}
          >
            <ServicesTab
              services={barber.services || []}
              selectedServiceIds={selectedServiceIds}
              onToggleService={onToggleService}
              selectedCount={selectedCount}
            />
            <Button
              onClick={onContinue}
              disabled={!hasSelection}
              size="lg"
              className="w-full mt-2"
            >
              ادامه و انتخاب زمان
            </Button>
          </section>

          <section
            role="tabpanel"
            id="barber-panel-about"
            aria-labelledby="barber-tab-about"
            hidden={activeTab !== 'about'}
            className="space-y-4"
          >
            {barber.bio && (
              <p className="text-gray-700 leading-8 text-justify">
                {barber.bio}
              </p>
            )}
            {barber.portfolio.length > 0 ? (
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm">
                  نمونه‌کارهای {barber.salonName}
                </h3>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {barber.portfolio.map((img, idx) => (
                    <div
                      key={idx}
                      className="min-w-[90px] w-[90px] aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
                      onClick={() => onImageClick(img)}
                    >
                      <img
                        src={getImageUrl(img)}
                        width={90}
                        height={90}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        alt={`نمونه‌کار سالن ${barber.salonName}، تصویر ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                توضیحات یا نمونه‌کاری برای این سالن ثبت نشده است.
              </p>
            )}
          </section>

          <section
            role="tabpanel"
            id="barber-panel-reviews"
            aria-labelledby="barber-tab-reviews"
            hidden={activeTab !== 'reviews'}
          >
            <ReviewsSection
              barberId={barber.userId ?? barber.id}
              rating={ratingValue}
              reviewCount={reviewCount}
              initialReviews={initialReviews}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

const ServicesTab: React.FC<{
  services: Service[];
  selectedServiceIds: string[];
  onToggleService: (id: string) => void;
  selectedCount: number;
}> = ({ services, selectedServiceIds, onToggleService, selectedCount }) => {
  return (
    <div>
      <p className="text-gray-700 leading-8 text-justify mb-6">
        خدمات مورد نظر خود را از لیست زیر انتخاب کنید. با انتخاب هر خدمت
        می‌توانید زمان مراجعه را در مرحله بعد رزرو کنید.
      </p>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-xl text-gray-900">انتخاب خدمات</h3>
        <span className="text-gray-500 text-sm">
          {selectedCount} مورد انتخاب شده
        </span>
      </div>

      <div className="space-y-3">
        {services.map(service => {
          const selected = selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              onClick={() => onToggleService(service.id)}
              className={`w-full text-right p-4 rounded-2xl flex items-center justify-between gap-3 transition-all border-2 bg-white ${
                selected
                  ? 'border-primary/60 shadow-md shadow-primary/10'
                  : 'border-gray-200 hover:border-primary/30'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  selected
                    ? 'bg-primary text-white'
                    : 'bg-white border-2 border-gray-300 text-transparent'
                }`}
              >
                <Check size={18} strokeWidth={3} />
              </div>

              {/* Name + duration */}
              <div className="flex-1 flex flex-col">
                <span className="font-bold text-gray-900 text-base">
                  {service.name}
                </span>
                <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  {service.durationMinutes} دقیقه
                  <Clock size={12} />
                </span>
              </div>

              {/* Price */}
              <div className="flex flex-col items-start">
                <span className="font-black text-primary text-lg">
                  {formatPrice(service.price)}
                </span>
                <span className="text-xs text-gray-400">تومان</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
