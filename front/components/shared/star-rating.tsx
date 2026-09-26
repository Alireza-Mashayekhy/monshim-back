'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn, toPersianDigits } from '@/lib/utils';

/** نمایش امتیاز با ستاره (غیرقابل ویرایش) */
export function StarRating({
  rating,
  size = 14,
  className,
  showValue = false,
}: {
  rating: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}) {
  const value = Math.round(Number(rating) || 0);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`امتیاز ${toPersianDigits(value)} از ۵`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={size}
          className={cn(
            index < value
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200',
          )}
        />
      ))}
      {showValue && (
        <span className="mr-1 text-xs font-bold text-gray-600">
          {toPersianDigits(Number(rating || 0).toFixed(1))}
        </span>
      )}
    </span>
  );
}

/** انتخاب امتیاز از ۱ تا ۵ (برای فرم ثبت نظر) */
export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = 30,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="انتخاب امتیاز"
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= active;
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${toPersianDigits(starValue)} از ۵`}
            disabled={disabled}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => !disabled && setHovered(starValue)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-200 text-gray-200',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
