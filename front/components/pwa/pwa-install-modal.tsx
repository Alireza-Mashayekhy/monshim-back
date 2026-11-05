'use client';

import {
  Check,
  Download,
  MonitorDown,
  PlusSquare,
  Share,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { pwaConfig } from '@/lib/pwa/config';
import { iosThirdPartyCanAdd, type Platform } from '@/lib/pwa/platform';

function IOSGuide({ platform }: { platform: Platform }) {
  const useSafari =
    platform === 'ios-other' ||
    (platform === 'ios-chrome' && !iosThirdPartyCanAdd(navigator.userAgent));
  return (
    <div className="rounded-xl border border-border bg-primary-3 p-4">
      <p className="mb-3 text-xs font-bold text-primary">
        نصب دستی{' '}
        {useSafari
          ? 'در Safari'
          : platform === 'ios-chrome'
            ? 'در Chrome'
            : 'از منوی مرورگر'}
      </p>
      {useSafari && (
        <p className="mb-3 text-xs leading-6 text-muted-foreground">
          این صفحه را در Safari باز کنید؛ در این نسخه، افزودن به صفحه اصلی از
          مرورگر فعلی ممکن است پشتیبانی نشود.
        </p>
      )}
      <ol className="space-y-3 text-sm leading-6">
        <li className="flex items-start gap-3">
          <Share
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-primary"
          />
          <span>روی دکمه اشتراک‌گذاری (Share) بزنید.</span>
        </li>
        <li className="flex items-start gap-3">
          <PlusSquare
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-primary"
          />
          <span>
            گزینه «افزودن به صفحه اصلی» (Add to Home Screen) را انتخاب کنید.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <Check
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-primary"
          />
          <span>برای تکمیل، روی «افزودن» (Add) بزنید.</span>
        </li>
      </ol>
    </div>
  );
}

export default function PWAInstallModal({
  platform,
  native,
  onDismiss,
  onInstall,
}: {
  platform: Platform;
  native: boolean;
  onDismiss: () => void;
  onInstall: () => void;
}) {
  const ios = platform.startsWith('ios-');
  const macSafari = platform === 'mac-safari';
  const desktop =
    platform === 'windows' || platform === 'mac-chromium' || macSafari;
  const title = ios
    ? pwaConfig.text.iosTitle
    : desktop
      ? pwaConfig.text.desktopTitle
      : pwaConfig.text.androidTitle;
  const description = ios
    ? pwaConfig.text.iosDescription
    : desktop
      ? pwaConfig.text.desktopDescription
      : pwaConfig.text.androidDescription;
  return (
    <Dialog
      open
      onOpenChange={next => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 rounded-2xl p-0 sm:max-w-md motion-reduce:animate-none"
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/pwa/icon-192.png"
                alt=""
                width={56}
                height={56}
                className="rounded-2xl border border-border"
              />
              <div>
                <p className="text-sm font-bold">منشیم</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  همراه خدمات و نوبت‌های شما
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="بستن پیشنهاد نصب"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </Button>
            </DialogClose>
          </div>
          <div className="mt-6 text-right">
            <DialogTitle className="text-lg font-bold leading-8">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-7">
              {description}
            </DialogDescription>
          </div>
          <div className="mt-5">
            {ios ? (
              <IOSGuide platform={platform} />
            ) : macSafari ? (
              <div className="flex gap-3 rounded-xl border border-border bg-primary-3 p-4 text-sm leading-7">
                <MonitorDown
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-primary"
                />
                <p>
                  در Safari از منوی File گزینه «Add to Dock» را انتخاب کنید، سپس
                  روی Add بزنید. این روش در Safari نسخه ۱۷ و جدیدتر پشتیبانی
                  می‌شود.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-primary-3 px-4 py-3 text-sm text-primary">
                <Smartphone aria-hidden="true" className="size-5 shrink-0" />
                <span>دسترسی سریع به منشیم از صفحه اصلی دستگاه</span>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {native && (
              <Button className="w-full" onClick={onInstall}>
                <Download aria-hidden="true" className="size-4" />
                {desktop ? 'نصب منشیم روی دسکتاپ' : 'نصب منشیم'}
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={onDismiss}>
              {native ? 'بعداً' : 'متوجه شدم'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
