import {
  Banknote,
  CalendarClock,
  CalendarPlus,
  Gift,
  LayoutList,
  Link2,
  type LucideIcon,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import SectionHeading from '@/components/marketing/section-heading';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** ۸ امکان اصلی — بر اساس امکانات واقعی پیاده‌سازی‌شده در پلتفرم منشیم */
const FEATURES: Feature[] = [
  {
    icon: CalendarClock,
    title: 'تقویم هوشمند نوبت‌ها',
    description: 'مدیریت نوبت‌های آنلاین و حضوری بدون تداخل ساعت‌ها',
  },
  {
    icon: MessageSquare,
    title: 'یادآوری پیامکی نوبت',
    description: 'پیامک یادآوری از ۱ تا ۲۴ ساعت قبل، به انتخاب شما',
  },
  {
    icon: Wallet,
    title: 'پرداخت آنلاین نوبت',
    description: 'دریافت هزینه نوبت با درگاه پرداخت امن',
  },
  {
    icon: Banknote,
    title: 'کیف پول و تسویه وجه',
    description: 'پیگیری موجودی و تراکنش‌ها و برداشت درآمد',
  },
  {
    icon: Gift,
    title: 'باشگاه مشتریان',
    description: 'پرونده مشتریان با شماره تماس و گروه‌بندی مشتری‌ها',
  },
  {
    icon: LayoutList,
    title: 'مدیریت خدمات و قیمت',
    description: 'تعریف قیمت، مدت‌زمان و قیمت بیعانه هر خدمت',
  },
  {
    icon: Link2,
    title: 'صفحه اختصاصی آرایشگاه',
    description: 'آدرس، نمونه‌کار، قیمت خدمات و اشتراک‌گذاری لینک رزرو',
  },
  {
    icon: CalendarPlus,
    title: 'ثبت نوبت دستی',
    description: 'ثبت نوبت‌های تلفنی و حضوری با ارسال لینک بیعانه',
  },
];

/**
 * بخش «امکانات اصلی منشیم» — ۸ کارت امکانات نرم افزار مدیریت آرایشگاه.
 * هر کارت شامل کلیدواژه‌های طولانی (Long-tail) مرتبط است.
 */
export default function HomeFeatures() {
  return (
    <section aria-labelledby="home-features-heading" className="bg-primary-3">
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-features-heading"
          eyebrow="امکانات منشیم"
          title="امکانات اصلی منشیم"
          description="منشیم فقط یک سایت رزرو آرایشگاه نیست؛ یک نرم افزار مدیریت آرایشگاه کامل است که نوبت دهی، مشتریان، پرداخت‌ها و یادآوری‌ها را ساده می‌کند."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(feature => (
            <li
              key={feature.title}
              className="group rounded-3xl border border-primary-100/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary-2 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mb-1.5 text-sm font-extrabold text-foreground">
                {feature.title}
              </h3>
              <p className="text-xs leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/barber-management"
            title="آشنایی کامل با نرم افزار مدیریت آرایشگاه منشیم"
            className="text-sm font-bold text-primary underline-offset-8 hover:underline"
          >
            آشنایی بیشتر با نرم افزار مدیریت آرایشگاه منشیم ←
          </Link>
        </div>
      </div>
    </section>
  );
}
