'use client';

import { useState } from 'react';

import { LightboxModal } from '@/components/pages/barber/lightboxModal';
import { publicImageUrlOrPlaceholder } from '@/lib/images';

/**
 * گالری نمونه‌کارهای سالن در صفحهٔ عمومی.
 * تصاویر در HTML سرور رندر می‌شوند (مهم برای سئو) و فقط لایت‌باکس سمت کلاینت است.
 */
export default function PortfolioGallery({
  images,
  salonName,
}: {
  images: string[];
  salonName: string;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images.length) return null;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {images.slice(0, 10).map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setSelectedImage(publicImageUrlOrPlaceholder(image))}
            className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
            aria-label={`نمونه‌کار ${index + 1} سالن ${salonName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicImageUrlOrPlaceholder(image)}
              alt={`نمونه‌کار سالن ${salonName}، تصویر ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <LightboxModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
