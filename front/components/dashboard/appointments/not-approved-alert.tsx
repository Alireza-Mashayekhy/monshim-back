'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const NOT_APPROVED_MESSAGE =
  'پروفایل شما هنوز تایید نشده و امکان ثبت رزرو دستی ندارید';

// هشدار عدم تایید پروفایل آرایشگر
export function NotApprovedAlert({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black leading-5 text-red-700">
          {NOT_APPROVED_MESSAGE}
        </p>
        <p className="mt-1 text-[11px] font-medium leading-5 text-red-600">
          بعد از تایید پروفایل توسط پشتیبانی، ثبت رزرو دستی فعال می‌شود.
        </p>
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className="mt-1.5 inline-block text-[11px] font-black text-red-800 underline underline-offset-2"
        >
          مشاهده پروفایل
        </Link>
      </div>
    </div>
  );
}
