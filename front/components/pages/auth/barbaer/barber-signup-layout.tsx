'use client';

import { Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { BackButton } from '@/components/shared/back-button';
import { toFa } from '@/lib/jalali';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 5;

interface BarberSignupLayoutProps {
  step: number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** برای مرحله ۱: برگشت به ورود / بقیه مراحل: مرحله قبل */
  onBack: () => void;
  children: React.ReactNode;
}

export default function BarberSignupLayout({
  step,
  title,
  subtitle,
  icon,
  onBack,
  children,
}: BarberSignupLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-800 flex flex-col justify-between relative overflow-x-hidden selection:bg-teal-500 selection:text-white">
      {/* Decorative top ambient background */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-primary/15 via-teal-500/5 to-transparent pointer-events-none -z-10" />

      {/* Decorative blur orbs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-32 -left-28 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top bar: back button + brand */}
      <div className="w-full max-w-lg mx-auto px-4 pt-5 pb-2 flex items-center justify-between">
        <BackButton func={onBack} />
        <Link
          href="/login"
          className="group flex items-center gap-2.5 focus:outline-none"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-teal-700 flex items-center justify-center shadow-lg shadow-primary/25 text-white ring-2 ring-white transition-transform group-hover:scale-105 duration-300">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-white ring-2 ring-white shadow">
              <Sparkles className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-black text-gray-900 leading-tight">
              منشیم
            </p>
            <p className="text-[10px] text-gray-500 font-medium">
              ثبت‌نام سالن و آرایشگر
            </p>
          </div>
        </Link>
        <div className="w-8" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col">
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 md:p-8 relative">
          {/* Step progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-gray-400">
                مرحله {toFa(step)} از {toFa(TOTAL_STEPS)}
              </span>
              <span className="text-[11px] font-bold text-primary">
                {title}
              </span>
            </div>
            <div className="flex gap-1.5" dir="rtl">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    i <= step ? 'bg-primary' : 'bg-gray-100',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Step header */}
          <div className="text-center mb-6">
            {icon && (
              <div className="w-14 h-14 rounded-2xl bg-primary-2 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-primary shadow-xs">
                {icon}
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-xs md:text-sm text-gray-500 mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
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
