'use client';

import { Store } from 'lucide-react';
import Image from 'next/image';

import { getFullImageUrl } from '@/lib/utils';

interface Props {
  salonName?: string | null;
  fullName?: string | null;
  profileImage?: string | null;
}

export default function DashboardHeader({
  salonName,
  fullName,
  profileImage,
}: Props) {
  const firstName = fullName ? fullName.split(' ')[0] : '';
  const imageUrl = getFullImageUrl(profileImage ?? null);

  return (
    <div className="flex items-center gap-3">
      {/* تصویر سالن / آرایشگر */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-primary/20 bg-primary-2 flex items-center justify-center text-primary font-black text-xl shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={salonName || 'سالن زیبایی'}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <Store size={26} />
        )}
      </div>

      {/* نام سالن و خوش‌آمدگویی */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight truncate">
          {salonName ? `سالن زیبایی ${salonName}` : 'داشبورد آرایشگر'}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-1">
          خوش آمدید، {firstName || 'همکار گرامی'} 👋
        </p>
      </div>
    </div>
  );
}
