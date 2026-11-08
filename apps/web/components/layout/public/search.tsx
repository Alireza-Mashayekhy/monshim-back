'use client';
import { SearchIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export default function Search() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setIsClosing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCloseSearch = () => {
    if (isClosing) return; // already closing
    setIsClosing(true);
    // Fallback: force close after 600ms if animationend doesn't fire
    closeTimeoutRef.current = setTimeout(() => {
      setIsSearchOpen(false);
      setIsClosing(false);
    }, 600);
  };

  // Cleanup timeout on unmount or successful close
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Remove panel after exit animation ends
  useEffect(() => {
    if (isClosing && panelRef.current) {
      const panel = panelRef.current;
      const handleAnimationEnd = (e: AnimationEvent) => {
        // Ensure it's our flyUp animation
        if (e.animationName === 'flyUp') {
          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          setIsSearchOpen(false);
          setIsClosing(false);
        }
      };
      panel.addEventListener('animationend', handleAnimationEnd);
      return () =>
        panel.removeEventListener('animationend', handleAnimationEnd);
    }
  }, [isClosing]);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={handleSearchClick}>
        <SearchIcon className="size-5" />
      </Button>

      <style>{`
        @keyframes ballDrop {
          0% { transform: translateY(-100%); }
          35% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
          65% { transform: translateY(0); }
          75% { transform: translateY(-12px); }
          85% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes flyUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      {isSearchOpen && (
        <div
          ref={panelRef}
          className="fixed z-50 bg-white flex flex-col items-center justify-start px-4"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            minHeight: '100vh',
            paddingTop: '5rem', // instead of pt-24 for better control
            animation: isClosing
              ? 'flyUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : 'ballDrop 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            willChange: 'transform',
          }}
        >
          <button
            onClick={handleCloseSearch}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition z-10"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>

          <div className="w-full max-w-2xl">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="جستجوی محصولات ..."
                className="w-full h-10 pr-10 pl-3 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                autoFocus={!isClosing}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
