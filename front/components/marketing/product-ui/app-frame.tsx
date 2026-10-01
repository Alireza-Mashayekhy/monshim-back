import type { ReactNode } from 'react';

/**
 * قاب پنجرهٔ پنل مدیریت منشیم.
 *
 * به‌جای تصویر کارتونی، خودِ رابط کاربری محصول با همان توکن‌های رنگی اپ
 * (primary #0D9488 / primary-2 #E6F9F6) رندر می‌شود؛ یعنی آنچه کاربر می‌بیند
 * markup واقعی است، نه یک نقاشی از محصول.
 */
export function DesktopAppFrame({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-primary/10 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <span className="mx-auto rounded-md bg-white px-3 py-1 text-[10px] font-medium text-gray-400 shadow-2xs">
          monshiim.ir{title ? ` — ${title}` : ''}
        </span>
      </div>
      {children}
    </div>
  );
}

/** قاب موبایل — برای نمایش تجربهٔ مشتری در اپ */
export function PhoneAppFrame({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border-[6px] border-gray-900/90 bg-white shadow-2xl shadow-primary/15 ${className}`}
    >
      <div className="flex items-center justify-center bg-gray-900/90 py-1.5">
        <span
          className="h-1 w-16 rounded-full bg-white/25"
          aria-hidden="true"
        />
      </div>
      {children}
    </div>
  );
}

/** سرتیتر مشترک داخل اسکرین‌شات‌ها */
export function ShotHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
      <div>
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white">
          {action}
        </span>
      ) : null}
    </div>
  );
}
