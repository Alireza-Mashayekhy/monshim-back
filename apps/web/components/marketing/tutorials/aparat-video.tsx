'use client';

import { Clapperboard, Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { aparatEmbedUrl } from '@/lib/aparat';

interface AparatVideoProps {
  /** videohash ویدیو در آپارات (بخش انتهایی لینک aparat.com/v/xxxx) */
  videoHash: string;
  /** عنوان ویدیو — برای title آی‌فریم و aria-label دکمهٔ پلی */
  title: string;
  /** آدرس پوستر؛ در نبودش گرادیان جایگزین نمایش داده می‌شود */
  posterUrl?: string | null;
  /** پوستر بالای صفحه با اولویت preload شود */
  priority?: boolean;
  className?: string;
}

/**
 * پخش‌کنندهٔ facade ویدیوی آپارات:
 *
 * تا قبل از تعامل کاربر فقط پوستر و دکمهٔ پلی رندر می‌شود و iframe سنگین
 * آپارات با اولین کلیک به DOM اضافه می‌شود (همان الگوی lite-youtube).
 * نتیجه: LCP و CLS صفحه مستقل از آپارات می‌ماند و در هر صفحه هر چند
 * ویدیو که باشد فقط ویدیوی clicked شده دانلود می‌کند.
 *
 * پوستر با `unoptimized` رندر می‌شود تا نیازی به افزودن دامنهٔ CDN آپارات
 * به `images.remotePatterns` نباشد.
 */
export default function AparatVideo({
  videoHash,
  title,
  posterUrl,
  priority = false,
  className = '',
}: AparatVideoProps) {
  const [activated, setActivated] = useState(false);

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-3xl bg-primary-2 ${className}`}
    >
      {activated ? (
        <iframe
          src={aparatEmbedUrl(videoHash)}
          title={title}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label={`پخش ویدیو: ${title}`}
          className="group absolute inset-0 size-full cursor-pointer"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              unoptimized
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary-2 via-white to-teal-800/80"
            >
              <Clapperboard className="size-10 text-teal-800/60" />
              <span className="text-xs font-bold text-teal-900/70">
                ویدیوی آموزشی منشیم
              </span>
            </span>
          )}

          <span
            aria-hidden="true"
            className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/40"
          />

          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl shadow-black/30 transition-transform duration-300 group-hover:scale-110"
          >
            <Play className="size-7 fill-primary text-primary" />
          </span>

          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white"
          >
            ویدیو از آپارات
          </span>
        </button>
      )}
    </div>
  );
}
