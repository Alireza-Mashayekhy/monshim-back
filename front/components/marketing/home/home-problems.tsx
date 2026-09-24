import {
  CalendarX2,
  FileQuestion,
  FolderX,
  type LucideIcon,
  PhoneOff,
  Puzzle,
  TrendingDown,
} from 'lucide-react';

import SectionHeading from '@/components/marketing/section-heading';

interface Problem {
  icon: LucideIcon;
  text: string;
}

const PROBLEMS: Problem[] = [
  { icon: PhoneOff, text: 'تماس‌های پیاپی برای رزرو تلفنی' },
  { icon: CalendarX2, text: 'فراموش شدن نوبت‌ها توسط مشتری' },
  { icon: Puzzle, text: 'نوبت‌های تداخلی و مدیریت دفترچه‌ای' },
  { icon: TrendingDown, text: 'ساعت‌های خالی و درآمد از دست رفته' },
  { icon: FolderX, text: 'گم شدن اطلاعات و سابقه مشتریان' },
  { icon: FileQuestion, text: 'بی‌خبری از پرطرفدارترین خدمات سالن' },
];

/**
 * بخش «مشکلاتی که منشیم حل می‌کند» — گرید مشکلات رایج مدیریت آرایشگاه
 * به‌همراه کارت تیره برجسته؛ متن‌ها با زبان مشکل مشتری (Problem-focused) نوشته شده‌اند.
 */
export default function HomeProblems() {
  return (
    <section
      aria-labelledby="home-problems-heading"
      className="bg-gradient-to-b from-background to-primary-2/50"
    >
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-problems-heading"
          title="مشکلاتی که منشیم حل می‌کند"
          description="مدیریت آرایشگاه بدون ابزار مناسب یعنی ساعت‌های خالی، نوبت‌های از دست رفته و مشتری‌هایی که برنمی‌گردند؛ منشیم دقیقاً همین مشکلات را حل کرده است."
        />

        <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(problem => (
            <li
              key={problem.text}
              className="flex items-center gap-3 rounded-2xl border border-primary-100/60 bg-white p-4 shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <problem.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-7 text-foreground/90">
                {problem.text}
              </span>
            </li>
          ))}

          {/* کارت تیره برجسته — مطابق طرح */}
          <li className="flex items-center gap-3 rounded-2xl bg-gradient-to-bl from-primary to-teal-700 p-4 text-white shadow-lg shadow-primary/20 sm:col-span-2 lg:col-span-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <TrendingDown className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-extrabold leading-7">
              نبود گزارش دقیق از درآمد و مشتریان؛ بزرگ‌ترین چالش مدیریت آرایشگاه
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
