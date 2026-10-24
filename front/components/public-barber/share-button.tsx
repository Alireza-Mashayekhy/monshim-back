'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** اشتراک‌گذاری/کپی لینک صفحهٔ عمومی سالن */
export default function ShareButton({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // کاربر اشتراک‌گذاری را لغو کرد یا مرورگر پشتیبانی نمی‌کند
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // دسترسی به کلیپ‌بورد ممکن است مسدود باشد
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={cn('gap-1.5', className)}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? 'کپی شد' : 'اشتراک‌گذاری'}
    </Button>
  );
}
