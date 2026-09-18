'use client';

import { ChevronLeft, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface AuthCardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export default function AuthCardLayout({
  children,
  title,
  subtitle,
  badgeText,
}: AuthCardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-800 flex flex-col justify-between relative overflow-x-hidden selection:bg-teal-500 selection:text-white">
      {/* Decorative top ambient background */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-primary/15 via-teal-500/5 to-transparent pointer-events-none -z-10" />

      {/* Decorative blur orbs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-32 -left-28 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main container */}
      <div className="w-full max-w-lg mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link
            href="/login"
            className="group flex flex-col items-center focus:outline-none"
          >
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-teal-700 flex items-center justify-center shadow-lg shadow-primary/25 text-white ring-4 ring-white transition-transform group-hover:scale-105 duration-300">
                <Scissors className="w-7 h-7 -rotate-45" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-white ring-2 ring-white shadow">
                <Sparkles className="w-3 h-3 fill-current" />
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              منشیم
            </h1>
          </Link>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">
            سامانه هوشمند نوبت‌دهی و رزرو آنلاین آرایشگاه
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 md:p-8 relative">
          {(title || subtitle || badgeText) && (
            <div className="text-center mb-6">
              {title && (
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>

        {/* Barber registration card */}
        <div className="w-full mt-6">
          <Link href="/barbaer-signup" className="block group">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 hover:from-amber-100/70 hover:to-orange-100/70 border border-amber-200/70 rounded-2xl p-4 transition-all duration-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <Scissors className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-900">
                    ثبت‌نام سالن‌ها و آرایشگران
                  </p>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    سالن خود را ثبت کنید و به هزاران مشتری وصل شوید
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-amber-600 transition-transform group-hover:-translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Security badge footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ارتباط امن با رمزنگاری داده‌ها</span>
        </div>
      </div>

      {/* Subtle bottom footer */}
      <footer className="w-full py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} منشیم — تمامی حقوق محفوظ است.
      </footer>
    </div>
  );
}
