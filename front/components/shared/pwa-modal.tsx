'use client';

import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PWA_DISMISSED_KEY = 'pwa-dismissed';
const SHOW_DELAY = 5000;
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}

export default function PWAModal() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const userAgent = useMemo(() => {
    if (typeof navigator === 'undefined') return '';
    return navigator.userAgent.toLowerCase();
  }, []);

  const isIOS = useMemo(() => {
    return /iphone|ipad|ipod/.test(userAgent);
  }, [userAgent]);

  const isMobile = useMemo(() => {
    const mobileUA =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );

    return mobileUA || windowWidth <= 768;
  }, [userAgent, windowWidth]);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true
    );
  }, []);

  useEffect(() => {
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();

      setPrompt(e);

      const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);

      if (dismissed) {
        const dismissedDate = new Date(dismissed).getTime();
        const now = Date.now();

        const daysSinceDismissed =
          (now - dismissedDate) / (1000 * 60 * 60 * 24);

        if (daysSinceDismissed < DISMISS_DAYS) {
          return;
        }
      }

      if (isMobile) {
        setTimeout(() => {
          setOpen(true);
        }, SHOW_DELAY);
      }
    };

    const handleAppInstalled = () => {
      setOpen(false);
      setPrompt(null);
      localStorage.removeItem(PWA_DISMISSED_KEY);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );

      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isMobile, isStandalone]);

  const handleInstall = async () => {
    if (!prompt) return;

    try {
      await prompt.prompt();

      const { outcome } = await prompt.userChoice;

      if (outcome !== 'accepted') {
        localStorage.setItem(PWA_DISMISSED_KEY, new Date().toISOString());
      }

      setPrompt(null);
      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLater = () => {
    localStorage.setItem(PWA_DISMISSED_KEY, new Date().toISOString());
    setOpen(false);
  };

  if (isStandalone || !isMobile) {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Download className="text-primary h-8 w-8" />
          </div>

          <DialogTitle className="text-center text-2xl">
            اپلیکیشن ما
          </DialogTitle>

          <DialogDescription className="pt-2 text-center text-sm">
            با نصب اپلیکیشن، دسترسی سریع‌تر و راحت‌تر خواهید داشت.
          </DialogDescription>
        </DialogHeader>

        {isIOS && (
          <div className="text-center text-sm">
            برای نصب در iOS دکمه اشتراک‌گذاری ⎋ و سپس «افزودن به صفحه اصلی ➕»
            را انتخاب کنید.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleLater} className="flex-1">
            بعداً
          </Button>

          {!isIOS && prompt && (
            <Button onClick={handleInstall} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              نصب اپلیکیشن
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
