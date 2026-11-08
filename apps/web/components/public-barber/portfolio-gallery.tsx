'use client';

import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LightboxModal } from '@/components/pages/barber/lightboxModal';
import { publicImageUrlOrPlaceholder } from '@/lib/images';
import { cn, toPersianDigits } from '@/lib/utils';

const AUTO_SLIDE_INTERVAL_MS = 3200;

interface VirtualSlide {
  key: string;
  src: string;
  realIndex: number;
}

/**
 * اسلایدر ۳تایی نمونه‌کارهای سالن که آیتم وسط بزرگ‌تر نمایش داده می‌شود و
 * به‌صورت خودکار و نرم ورق می‌خورد.
 */
export default function PortfolioGallery({
  images,
  salonName,
}: {
  images: string[];
  salonName: string;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeVirtualIndex, setActiveVirtualIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const cleanImages = useMemo(
    () => images.filter(Boolean).slice(0, 12),
    [images],
  );

  // برای چرخش بی‌وقفهٔ ۳تایی بدون پرش عرضی، طول حلقهٔ مجازی حداقل ۶ آیتم و مضربی از طول واقعی است
  const virtualSlides = useMemo<VirtualSlide[]>(() => {
    const count = cleanImages.length;
    if (count === 0) return [];
    if (count === 1) {
      return [
        {
          key: `single-0`,
          src: publicImageUrlOrPlaceholder(cleanImages[0]),
          realIndex: 0,
        },
      ];
    }

    const repeats = Math.max(1, Math.ceil(6 / count));
    const list: VirtualSlide[] = [];
    for (let r = 0; r < repeats; r += 1) {
      cleanImages.forEach((img, idx) => {
        list.push({
          key: `slide-${r}-${idx}`,
          src: publicImageUrlOrPlaceholder(img),
          realIndex: idx,
        });
      });
    }
    return list;
  }, [cleanImages]);

  const virtualLength = virtualSlides.length;

  const stepNext = useCallback(() => {
    if (virtualLength <= 1) return;
    setActiveVirtualIndex(prev => (prev + 1) % virtualLength);
  }, [virtualLength]);

  const stepPrev = useCallback(() => {
    if (virtualLength <= 1) return;
    setActiveVirtualIndex(prev => (prev - 1 + virtualLength) % virtualLength);
  }, [virtualLength]);

  useEffect(() => {
    if (virtualLength <= 1 || isPaused || selectedImage) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timer = window.setInterval(stepNext, AUTO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [virtualLength, isPaused, selectedImage, stepNext]);

  if (!cleanImages.length) return null;

  // اگر فقط یک نمونه‌کار ثبت شده باشد، قاب مربعی تکی در مرکز نمایش داده می‌شود
  if (cleanImages.length === 1) {
    const singleSrc = publicImageUrlOrPlaceholder(cleanImages[0]);
    return (
      <div className="mt-4">
        <div className="mx-auto w-3/5 max-w-[260px]">
          <button
            type="button"
            onClick={() => setSelectedImage(singleSrc)}
            className="group relative block aspect-square w-full overflow-hidden rounded-3xl border-2 border-white bg-gray-100 shadow-lg"
            aria-label={`بزرگ‌نمایی نمونه‌کار سالن ${salonName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={singleSrc}
              alt={`نمونه‌کار سالن ${salonName}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute bottom-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs">
              <Expand size={14} />
            </span>
          </button>
        </div>

        <LightboxModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      </div>
    );
  }

  const activeRealIndex =
    virtualSlides[activeVirtualIndex % virtualLength]?.realIndex ?? 0;

  const getCircularOffset = (index: number) => {
    const normalizedActive = activeVirtualIndex % virtualLength;
    let diff = index - normalizedActive;
    const half = Math.floor(virtualLength / 2);
    if (diff > half) diff -= virtualLength;
    if (diff < -half) diff += virtualLength;
    return diff;
  };

  const jumpToRealIndex = (targetRealIndex: number) => {
    const currentReal = activeRealIndex;
    if (targetRealIndex === currentReal) return;
    let delta = targetRealIndex - currentReal;
    const realCount = cleanImages.length;
    if (delta > realCount / 2) delta -= realCount;
    if (delta < -realCount / 2) delta += realCount;
    setActiveVirtualIndex(
      prev => (prev + delta + virtualLength) % virtualLength,
    );
  };

  return (
    <div
      className="mt-4 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={e => {
        setIsPaused(true);
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={e => {
        const startX = touchStartX.current;
        const endX = e.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        if (startX !== null && endX !== null) {
          const diffX = endX - startX;
          if (Math.abs(diffX) > 36) {
            if (diffX > 0) {
              stepPrev();
            } else {
              stepNext();
            }
          }
        }
        setIsPaused(false);
      }}
    >
      {/* صحنهٔ ۳تایی اسلایدر (چپ کوچک، وسط بزرگ و برجسته، راست کوچک) */}
      <div
        dir="ltr"
        className="relative aspect-[100/48] w-full overflow-hidden py-2"
      >
        {virtualSlides.map((slide, index) => {
          const offset = getCircularOffset(index);
          const isCenter = offset === 0;
          const isSide = offset === -1 || offset === 1;
          const isVisible = isCenter || isSide;

          let transformValue = 'translate3d(-50%, -50%, 0) scale(0.55)';
          if (isCenter) {
            transformValue = 'translate3d(-50%, -50%, 0) scale(1.14)';
          } else if (offset === -1) {
            transformValue =
              'translate3d(calc(-50% - 96%), -50%, 0) scale(0.82)';
          } else if (offset === 1) {
            transformValue =
              'translate3d(calc(-50% + 96%), -50%, 0) scale(0.82)';
          } else if (offset < -1) {
            transformValue =
              'translate3d(calc(-50% - 175%), -50%, 0) scale(0.58)';
          } else if (offset > 1) {
            transformValue =
              'translate3d(calc(-50% + 175%), -50%, 0) scale(0.58)';
          }

          return (
            <button
              key={slide.key}
              type="button"
              tabIndex={isVisible ? 0 : -1}
              aria-hidden={!isVisible}
              onClick={() => {
                if (isCenter) {
                  setSelectedImage(slide.src);
                } else if (offset === -1) {
                  stepPrev();
                } else if (offset === 1) {
                  stepNext();
                }
              }}
              style={{
                left: '50%',
                top: '50%',
                transform: transformValue,
                zIndex: isCenter ? 30 : isSide ? 20 : 10,
                opacity: isCenter ? 1 : isSide ? 0.68 : 0,
              }}
              className={cn(
                'group absolute aspect-square w-[36%] overflow-hidden bg-gray-100 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isCenter
                  ? 'rounded-[24px] border-2 border-white shadow-[0_18px_38px_-12px_rgba(15,23,42,0.35)] sm:rounded-[28px]'
                  : 'rounded-2xl border border-white/70 shadow-md hover:opacity-90 sm:rounded-[22px]',
                !isVisible && 'pointer-events-none',
              )}
              aria-label={
                isCenter
                  ? `بزرگ‌نمایی نمونه‌کار ${toPersianDigits(slide.realIndex + 1)} سالن ${salonName}`
                  : `نمایش نمونه‌کار ${toPersianDigits(slide.realIndex + 1)}`
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={`نمونه‌کار سالن ${salonName}، تصویر ${slide.realIndex + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />

              {!isCenter && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-slate-950/15 transition-opacity group-hover:opacity-0"
                />
              )}

              {isCenter && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-85 backdrop-blur-xs transition-transform group-hover:scale-110 sm:bottom-2.5 sm:left-2.5 sm:size-8"
                >
                  <Expand size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* کنترل‌های ظریف پایین اسلایدر + نقطه‌های وضعیت */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={stepNext}
          aria-label="نمونه‌کار بعدی"
          className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-2xs transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronRight size={15} />
        </button>

        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="انتخاب نمونه‌کار"
        >
          {cleanImages.map((_, idx) => {
            const active = idx === activeRealIndex;
            return (
              <button
                key={`dot-${idx}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`نمونه‌کار ${toPersianDigits(idx + 1)}`}
                onClick={() => jumpToRealIndex(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  active
                    ? 'w-6 bg-primary'
                    : 'w-1.5 bg-gray-300 hover:bg-gray-400',
                )}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={stepPrev}
          aria-label="نمونه‌کار قبلی"
          className="flex size-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-2xs transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <LightboxModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
