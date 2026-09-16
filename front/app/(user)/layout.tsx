'use client';

import {
  Calendar,
  Headphones,
  Home,
  LayoutDashboard,
  Search,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { useCurrentUser } from '@/services/features/auth/hooks';

interface UserLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function UserLayout({
  children,
  showNav = true,
}: UserLayoutProps) {
  const pathname = usePathname();

  // تنها منبع حقیقی: پاسخ /auth/me (همگام با سرور، استور و middleware)
  const { isBarber } = useCurrentUser();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen flex justify-center w-full">
      <div className="w-full shadow-xl min-h-screen relative flex flex-col">
        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto ${showNav ? 'pb-20' : ''}`}>
          {children}
        </div>

        {/* Support */}
        {showNav && !isActive('/support') && (
          <Link href="/support">
            <button
              className="fixed bottom-24 right-4 z-40 bg-white text-primary-600 p-3 rounded-xl shadow-lg border border-primary-100 active:scale-95 transition-transform"
              title="پشتیبانی آنلاین"
            >
              <Headphones size={24} />
            </button>
          </Link>
        )}

        {/* Bottom Navigation */}
        {showNav && (
          <div className="fixed bottom-4 w-[calc(100vw-32px)] left-4 right-4 max-w-lg bg-white border border-border rounded-xl p-2 flex justify-between items-center z-50">
            <Link
              href="/home"
              className={`flex flex-col items-center gap-1 transition-all w-17.5 ${
                isActive('/home')
                  ? 'bg-[#E6F9F6] text-[#0D9488] px-2 pb-1 pt-2 rounded-lg font-bold'
                  : 'text-gray-400 hover:text-gray-600 px-2 pb-1 pt-2'
              }`}
            >
              <Home
                size={20}
                className={
                  isActive('/home') ? 'text-[#0D9488]' : 'text-gray-400'
                }
              />
              <span className="text-[11px]">خانه</span>
            </Link>

            <Link
              href="/explore"
              className={`flex flex-col items-center gap-1 transition-all w-17.5 ${
                isActive('/explore')
                  ? 'bg-[#E6F9F6] text-[#0D9488] px-2 pb-1 pt-2 rounded-lg font-bold'
                  : 'text-gray-400 hover:text-gray-600 px-2 pb-1 pt-2'
              }`}
            >
              <Search
                size={20}
                className={
                  isActive('/explore') ? 'text-[#0D9488]' : 'text-gray-400'
                }
              />
              <span className="text-[11px]">جستجو</span>
            </Link>

            <Link
              href="/appointments"
              className={`flex flex-col items-center gap-1 transition-all w-17.5 ${
                isActive('/appointments')
                  ? 'bg-[#E6F9F6] text-[#0D9488] px-2 pb-1 pt-2 rounded-lg font-bold'
                  : 'text-gray-400 hover:text-gray-600 px-2 pb-1 pt-2'
              }`}
            >
              <Calendar
                size={20}
                className={
                  isActive('/appointments') ? 'text-[#0D9488]' : 'text-gray-400'
                }
              />
              <span className="text-[11px]">رزروهای من</span>
            </Link>

            {isBarber && (
              <Link
                href="/dashboard"
                className={`flex flex-col items-center gap-1 transition-all w-17.5 ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-[#E6F9F6] text-[#0D9488] px-2 pb-1 pt-2 rounded-lg font-bold'
                    : 'text-gray-400 hover:text-gray-600 px-2 pb-1 pt-2'
                }`}
              >
                <LayoutDashboard
                  size={20}
                  className={
                    pathname.startsWith('/dashboard')
                      ? 'text-[#0D9488]'
                      : 'text-gray-400'
                  }
                />
                <span className="text-[11px]">داشبورد</span>
              </Link>
            )}

            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 transition-all w-17.5 ${
                isActive('/profile')
                  ? 'bg-[#E6F9F6] text-[#0D9488] px-2 pb-1 pt-2 rounded-lg font-bold'
                  : 'text-gray-400 hover:text-gray-600 px-2 pb-1 pt-2'
              }`}
            >
              <User
                size={20}
                className={
                  isActive('/profile') ? 'text-[#0D9488]' : 'text-gray-400'
                }
              />
              <span className="text-[11px]">پروفایل</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
