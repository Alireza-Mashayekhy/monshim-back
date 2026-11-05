'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { pwaConfig } from '@/lib/pwa/config';
import {
  detectPlatform,
  isInstallSurface,
  isStandalone,
  type Platform,
  supportsMacSafariDock,
} from '@/lib/pwa/platform';

const InstallModal = dynamic(() => import('./pwa-install-modal'), {
  ssr: false,
});

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function dismissedRecently() {
  try {
    const value = Number(localStorage.getItem(pwaConfig.dismissalKey));
    return value > 0 && Date.now() - value < pwaConfig.dismissalMs;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(pwaConfig.dismissalKey, String(Date.now()));
  } catch {
    /* storage may be blocked */
  }
}

export default function PWAInstallManager() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<Platform>('other');
  const [manual, setManual] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    const detected = detectPlatform(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    );
    const syncDisplay = () => setStandalone(isStandalone());
    const display = window.matchMedia('(display-mode: standalone)');
    const fullscreen = window.matchMedia('(display-mode: fullscreen)');
    syncDisplay();
    // Initial browser capability detection must happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detected);

    setManual(
      detected.startsWith('ios-') ||
        (detected === 'mac-safari' &&
          supportsMacSafariDock(navigator.userAgent)),
    );
    const beforeInstall = (event: Event) => {
      // iOS has no beforeinstallprompt. Do not suppress the browser's own UI on unsupported platforms.
      if (!['android', 'windows', 'mac-chromium'].includes(detected)) return;
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setOpen(false);
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    display.addEventListener('change', syncDisplay);
    fullscreen.addEventListener('change', syncDisplay);
    // Registration is independent of install UI and never touches the API/session.
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator &&
      window.isSecureContext
    ) {
      const register = () => {
        void navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .catch(() => {});
      };
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
      return () => {
        window.removeEventListener('load', register);
        window.removeEventListener('beforeinstallprompt', beforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
        display.removeEventListener('change', syncDisplay);
        fullscreen.removeEventListener('change', syncDisplay);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      display.removeEventListener('change', syncDisplay);
      fullscreen.removeEventListener('change', syncDisplay);
    };
  }, []);

  useEffect(() => {
    if (
      standalone ||
      installed ||
      !pathname ||
      !isInstallSurface(pathname) ||
      (!manual && !prompt) ||
      attempted.current ||
      dismissedRecently()
    )
      return;
    const timer = window.setTimeout(() => {
      // Never stack over another dialog or interrupt typing or a background tab.
      const active = document.activeElement;
      if (
        document.visibilityState !== 'visible' ||
        document.querySelector('[role="dialog"], [role="alertdialog"]') ||
        (active instanceof HTMLElement &&
          (active.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)))
      )
        return;
      attempted.current = true;
      setOpen(true);
    }, pwaConfig.showDelayMs);
    return () => window.clearTimeout(timer);
  }, [pathname, manual, prompt, standalone, installed]);

  useEffect(() => {
    // A navigation dismisses an already-open suggestion without recording a user choice.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Route transitions should never leave the suggestion covering a transactional flow.
  const visible =
    open &&
    !!pathname &&
    isInstallSurface(pathname) &&
    !standalone &&
    !installed;
  const dismiss = () => {
    rememberDismissal();
    setOpen(false);
  };
  const install = async () => {
    if (!prompt) return;
    setPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'dismissed') rememberDismissal();
    } catch {
      // The event can expire or be rejected by the browser; do not show a dead button.
      rememberDismissal();
    }
    setOpen(false);
  };

  return visible ? (
    <InstallModal
      platform={platform}
      native={!!prompt}
      onDismiss={dismiss}
      onInstall={install}
    />
  ) : null;
}
