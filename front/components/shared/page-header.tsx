'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { cn } from '@/lib/utils';

import { Button } from '../ui/button';

export interface PageHeaderProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backHref,
  onBack,
  showBackButton = true,
  rightAction,
  leftAction,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        'relative flex items-center justify-between py-2 px-1 select-none',
        className,
      )}
    >
      {/* سمت راست: دکمه بازگشت (در زبان فارسی و RTL) */}
      <div className="flex items-center justify-start min-w-10">
        {rightAction ? (
          rightAction
        ) : showBackButton ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleBack}
            aria-label="بازگشت"
          >
            <ArrowRight size={20} className="text-gray-800" />
          </Button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* عنوان در وسط */}
      <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight text-center truncate px-2">
        {title}
      </h1>

      {/* سمت چپ: اکشن دلخواه یا فاصله‌گذار برای حفظ تقارن عنوان */}
      <div className="flex items-center justify-end min-w-10">
        {leftAction || <div className="w-10 h-10" />}
      </div>
    </header>
  );
}

export default PageHeader;
