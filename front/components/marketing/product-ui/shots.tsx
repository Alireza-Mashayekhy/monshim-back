import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Clock3,
  Hourglass,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';

import { DesktopAppFrame, PhoneAppFrame, ShotHeader } from './app-frame';

/**
 * اسکرین‌شات‌های رابط کاربری منشیم.
 *
 * به‌جای ایلاستریشن کارتونی، خودِ UI محصول با markup واقعی و همان توکن‌های
 * رنگی/برچسب‌های وضعیت پنل واقعی (pending/confirmed/completed و ...) رندر
 * می‌شود. قاب‌ها پیش‌نمایش‌اند؛ آمار و ارقام واقعی سالن‌ها در آن‌ها نمایش داده نمی‌شود.
 */

const DASHBOARD_STATS = [
  {
    label: 'نوبت‌های امروز',
    value: '—',
    sub: 'با ثبت نوبت نمایش داده می‌شود',
  },
  { label: 'درآمد امروز', value: '—', sub: 'وابسته به رزروهای سالن' },
  { label: 'مشتریان باشگاه', value: '—', sub: 'اطلاعات حساب شما' },
] as const;

const TODAY_BOOKINGS = [
  {
    time: '۱۰:۰۰',
    name: 'مشتری نمونه',
    service: 'خدمت ثبت‌شده',
    status: 'تأیید شده',
    tone: 'confirmed' as const,
  },
  {
    time: '۱۱:۳۰',
    name: 'مشتری نمونه',
    service: 'خدمت ثبت‌شده',
    status: 'در انتظار',
    tone: 'pending' as const,
  },
  {
    time: '۱۳:۰۰',
    name: 'مشتری نمونه',
    service: 'خدمت ثبت‌شده',
    status: 'تأیید شده',
    tone: 'confirmed' as const,
  },
  {
    time: '۱۵:۳۰',
    name: 'مشتری نمونه',
    service: 'خدمت ثبت‌شده',
    status: 'انجام شده',
    tone: 'completed' as const,
  },
];

const STATUS_TONE = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
} as const;

/** داشبورد آرایشگر — نوبت‌های امروز + آمار */
export function DashboardShot({ className = '' }: { className?: string }) {
  return (
    <DesktopAppFrame title="داشبورد مدیریت سالن" className={className}>
      <div className="bg-gray-50/40 px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-gray-900">
              سلام، سالن شما ✂️
            </p>
            <p className="text-[11px] text-gray-500">پیش‌نمایش رابط کاربری</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-white">
            <Plus className="size-3.5" aria-hidden="true" />
            ثبت نوبت دستی
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {DASHBOARD_STATS.map(stat => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-100 bg-white p-3 shadow-2xs"
            >
              <p className="truncate text-[10px] font-bold text-gray-500">
                {stat.label}
              </p>
              <p className="mt-1.5 text-base font-black text-gray-900">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <ShotHeader
        title="نوبت‌های امروز"
        subtitle="تأیید، لغو یا جابه‌جایی با یک کلیک"
        action="همه نوبت‌ها"
      />

      <ul className="divide-y divide-gray-50">
        {TODAY_BOOKINGS.map(booking => (
          <li
            key={`${booking.time}-${booking.name}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="w-11 shrink-0 text-center text-xs font-black text-primary">
              {booking.time}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-gray-900">
                {booking.name}
              </span>
              <span className="block truncate text-[11px] text-gray-500">
                {booking.service}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${STATUS_TONE[booking.tone]}`}
            >
              {booking.status}
            </span>
          </li>
        ))}
      </ul>
    </DesktopAppFrame>
  );
}

const CALENDAR_DAYS = [
  {
    day: 'شنبه',
    date: '۱۴',
    bookings: ['۱۰:۰۰ علی', '۱۱:۳۰ محمد', '۱۳:۰۰ رضا'],
  },
  { day: 'یکشنبه', date: '۱۵', bookings: ['۰۹:۳۰ سینا', '۱۲:۰۰ امیر'] },
  {
    day: 'دوشنبه',
    date: '۱۶',
    bookings: ['۱۰:۰۰ مهدی', '۱۴:۰۰ پویا', '۱۶:۳۰ بهرام'],
  },
  { day: 'سه‌شنبه', date: '۱۷', bookings: ['۱۱:۰۰ حامد'] },
  { day: 'چهارشنبه', date: '۱۸', bookings: ['۱۰:۳۰ نیما', '۱۵:۰۰ آرش'] },
];

/** تقویم هوشمند — نمای هفتگی نوبت‌ها */
export function CalendarShot({ className = '' }: { className?: string }) {
  return (
    <DesktopAppFrame title="تقویم هوشمند نوبت‌ها" className={className}>
      <ShotHeader
        title="تقویم هوشمند نوبت‌ها"
        subtitle="نمایش هفتگی • جلوگیری خودکار از تداخل ساعت"
        action="نوبت جدید"
      />
      <div className="grid grid-cols-5 divide-x divide-x-reverse divide-gray-100 border-t border-gray-50">
        {CALENDAR_DAYS.map((column, index) => (
          <div key={column.day} className="min-w-0 p-2.5">
            <p
              className={`mb-2 rounded-lg py-1.5 text-center text-[10px] font-black ${
                index === 0
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {column.day}
              <span className="mr-1 font-normal opacity-80">{column.date}</span>
            </p>
            <ul className="space-y-1.5">
              {column.bookings.map(booking => (
                <li
                  key={booking}
                  className="truncate rounded-lg border-r-2 border-primary bg-primary-2 px-2 py-1.5 text-[10px] font-bold text-primary"
                >
                  {booking}
                </li>
              ))}
              {column.bookings.length < 3 ? (
                <li className="rounded-lg border border-dashed border-gray-200 px-2 py-1.5 text-center text-[10px] text-gray-500">
                  ساعت خالی
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </DesktopAppFrame>
  );
}

const CLUB_CUSTOMERS = [
  {
    name: 'مشتری نمونه ۱',
    visits: 'سابقهٔ مراجعه',
    last: 'زمان آخرین مراجعه',
    group: 'VIP',
  },
  {
    name: 'مشتری نمونه ۲',
    visits: 'سابقهٔ مراجعه',
    last: 'زمان آخرین مراجعه',
    group: 'وفادار',
  },
  {
    name: 'مشتری نمونه ۳',
    visits: 'سابقهٔ مراجعه',
    last: 'زمان آخرین مراجعه',
    group: 'جدید',
  },
  {
    name: 'مشتری نمونه ۴',
    visits: 'سابقهٔ مراجعه',
    last: 'زمان آخرین مراجعه',
    group: 'VIP',
  },
];

const GROUP_TONE: Record<string, string> = {
  VIP: 'bg-amber-50 text-amber-700 border-amber-200',
  وفادار: 'bg-primary-2 text-primary border-primary/20',
  جدید: 'bg-blue-50 text-blue-700 border-blue-200',
};

/** باشگاه مشتریان — پرونده و گروه‌بندی مشتری‌ها */
export function CustomersShot({ className = '' }: { className?: string }) {
  return (
    <DesktopAppFrame title="باشگاه مشتریان" className={className}>
      <ShotHeader
        title="باشگاه مشتریان"
        subtitle="پیش‌نمایش سوابق و گروه‌بندی مشتریان"
        action="مشتری جدید"
      />
      <div className="border-t border-gray-50 px-4 py-3">
        <span className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
          <Search className="size-3.5" aria-hidden="true" />
          جست‌وجوی مشتری بر اساس نام یا شماره موبایل
        </span>
      </div>
      <ul className="divide-y divide-gray-50">
        {CLUB_CUSTOMERS.map(customer => (
          <li key={customer.name} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-2 text-primary"
            >
              <Users className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-gray-900">
                {customer.name}
              </span>
              <span className="block truncate text-[11px] text-gray-500">
                {customer.visits} • {customer.last}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${GROUP_TONE[customer.group]}`}
            >
              {customer.group}
            </span>
          </li>
        ))}
      </ul>
    </DesktopAppFrame>
  );
}

const WALLET_TX = [
  { title: 'دریافت بیعانهٔ نوبت', amount: '—', income: true },
  { title: 'تسویه وجه به کارت', amount: '—', income: false },
  { title: 'تراکنش رزرو', amount: '—', income: true },
];

/** کیف پول و گزارش مالی */
export function WalletShot({ className = '' }: { className?: string }) {
  return (
    <DesktopAppFrame title="کیف پول و درآمد" className={className}>
      <div className="bg-gradient-to-bl from-primary to-teal-800 px-4 py-5 text-white">
        <p className="text-[11px] text-white/90">موجودی قابل برداشت</p>
        <p className="mt-1 text-2xl font-black">—</p>
        <p className="text-[11px] text-white/90">تومان</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-primary">
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          درخواست تسویه وجه
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-100 border-y border-gray-50">
        <div className="p-3.5">
          <p className="text-[10px] font-bold text-gray-500">درآمد این ماه</p>
          <p className="mt-1 text-base font-black text-gray-900">—</p>
        </div>
        <div className="p-3.5">
          <p className="text-[10px] font-bold text-gray-500">نوبت‌های ماه</p>
          <p className="mt-1 text-base font-black text-gray-900">—</p>
        </div>
      </div>

      <ul className="divide-y divide-gray-50">
        {WALLET_TX.map(tx => (
          <li key={tx.title} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                tx.income
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tx.income ? (
                <ArrowDownLeft className="size-4" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-700">
              {tx.title}
            </span>
            <span
              className={`shrink-0 text-xs font-black ${
                tx.income ? 'text-green-700' : 'text-gray-500'
              }`}
            >
              {tx.amount}
            </span>
          </li>
        ))}
      </ul>
    </DesktopAppFrame>
  );
}

const BOOKING_SERVICES = [
  {
    name: 'خدمت نمونه ۱',
    minutes: null,
    price: 'قیمت ثبت‌شده',
    selected: true,
  },
  {
    name: 'خدمت نمونه ۲',
    minutes: null,
    price: 'قیمت ثبت‌شده',
    selected: true,
  },
  {
    name: 'خدمت نمونه ۳',
    minutes: null,
    price: 'قیمت ثبت‌شده',
    selected: false,
  },
];

const BOOKING_SLOTS = [
  { time: '۱۰:۰۰', free: false },
  { time: '۱۱:۳۰', free: true },
  { time: '۱۳:۰۰', free: true },
  { time: '۱۵:۳۰', free: false },
  { time: '۱۷:۰۰', free: true },
  { time: '۱۸:۳۰', free: true },
];

/** تجربهٔ مشتری — صفحهٔ اختصاصی آرایشگاه، انتخاب خدمت و ساعت خالی */
export function BookingShot({ className = '' }: { className?: string }) {
  return (
    <PhoneAppFrame className={className}>
      <div className="bg-primary-2 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-gray-900">
              آرایشگاه نمونه
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
              <MapPin className="size-3 text-primary" aria-hidden="true" />
              موقعیت ثبت‌شدهٔ سالن
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[9px] font-bold text-primary">
            پیش‌نمایش
          </span>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[11px] font-bold text-gray-700">
          خدمات مورد نظر را انتخاب کنید
        </p>
        <ul className="mt-2.5 space-y-2">
          {BOOKING_SERVICES.map(service => (
            <li
              key={service.name}
              className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 ${
                service.selected
                  ? 'border-primary/50 bg-white shadow-2xs'
                  : 'border-gray-100 bg-gray-50/60'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                  service.selected
                    ? 'bg-primary text-white'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                {service.selected ? <Check className="size-3.5" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-gray-900">
                  {service.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Clock className="size-2.5" aria-hidden="true" />
                  {service.minutes ? `${service.minutes} دقیقه` : 'مدت ثبت‌شده'}
                </span>
              </span>
              <span className="shrink-0 text-left">
                <span className="block text-[11px] font-black text-primary">
                  {service.price}
                </span>
                <span className="block text-[9px] text-gray-500">
                  توسط سالن
                </span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
          <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
          ساعت‌های انتخابی در تقویم رزرو
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {BOOKING_SLOTS.map(slot => (
            <span
              key={slot.time}
              className={`rounded-lg py-2 text-center text-[10px] font-bold ${
                slot.free
                  ? 'bg-primary-2 text-primary'
                  : 'bg-gray-100 text-gray-600 line-through'
              }`}
            >
              {slot.time}
            </span>
          ))}
        </div>

        <span className="mt-4 block rounded-xl bg-primary py-3 text-center text-[11px] font-bold text-white">
          ادامه و پرداخت آنلاین
        </span>
        <p className="mt-2 text-center text-[9px] leading-4 text-gray-500">
          یادآوری پیامکی در صورت فعال‌بودن برای نوبت ارسال می‌شود
        </p>
      </div>
    </PhoneAppFrame>
  );
}

/** قاب کیف پول برای موبایل — درآمد سالن در جیب آرایشگر */
export function WalletMobileShot({ className = '' }: { className?: string }) {
  return (
    <PhoneAppFrame className={className}>
      <div className="bg-gradient-to-bl from-primary to-teal-800 px-4 py-6 text-white">
        <span className="flex items-center gap-1.5 text-[11px] text-white/90">
          <Wallet className="size-3.5" aria-hidden="true" />
          کیف پول منشیم
        </span>
        <p className="mt-2 text-2xl font-black">—</p>
        <p className="text-[11px] text-white/90">تومان • قابل برداشت</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {WALLET_TX.map(tx => (
          <li key={tx.title} className="flex items-center gap-2.5 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-700">
              {tx.title}
            </span>
            <span
              className={`shrink-0 text-[11px] font-black ${
                tx.income ? 'text-green-700' : 'text-gray-500'
              }`}
            >
              {tx.amount}
            </span>
          </li>
        ))}
      </ul>
    </PhoneAppFrame>
  );
}

/* ---------------------------------------------------------------- *
 *  صفحهٔ «نوبت‌ها» — بازسازی دقیق داشبورد واقعی مدیریت نوبت منشیم
 * ---------------------------------------------------------------- */

const APPT_SUMMARY = [
  {
    icon: CalendarDays,
    label: 'نوبت‌های امروز',
    value: '—',
    sub: 'نمایش بر اساس رزروهای سالن',
    tone: 'teal',
  },
  {
    icon: Wallet,
    label: 'درآمد امروز',
    value: '—',
    sub: 'وابسته به رزروهای سالن',
    tone: 'teal',
  },
  {
    icon: Hourglass,
    label: 'در انتظار تایید',
    value: '—',
    sub: 'نمایش بر اساس وضعیت رزرو',
    tone: 'amber',
  },
  {
    icon: Clock3,
    label: 'نوبت بعدی',
    value: '—',
    sub: 'با ثبت نوبت نمایش داده می‌شود',
    tone: 'teal',
  },
] as const;

const APPT_FILTERS = ['امروز', 'فردا', 'این هفته', 'این ماه', 'همه'] as const;

/** کارت نوبت — همان ساختار components/dashboard/appointments/appointment-card */
function AppointmentRow({
  time,
  duration,
  name,
  phone,
  service,
  price,
  status,
  isToday,
}: {
  time: string;
  duration: string;
  name: string;
  phone: string;
  service: string;
  price: string;
  status: 'pending' | 'confirmed';
  isToday?: boolean;
}) {
  const pending = status === 'pending';
  return (
    <div
      className={`flex gap-3 rounded-3xl border p-3.5 ${
        pending ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-white'
      }`}
    >
      {/* ستون ساعت */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1">
        <div
          className={`flex w-full flex-col items-center rounded-2xl py-2.5 ${
            isToday && !pending
              ? 'bg-primary text-white'
              : 'bg-gray-50 text-gray-700'
          }`}
        >
          <span className="text-base font-black leading-none">{time}</span>
          <span
            className={`mt-1 text-[9px] font-bold ${
              isToday && !pending ? 'text-white/90' : 'text-gray-500'
            }`}
          >
            {duration}
          </span>
        </div>
        {pending ? (
          <span className="mt-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-black text-gray-900">{name}</span>
              <span
                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                  pending
                    ? 'border-amber-200 bg-amber-100 text-amber-700'
                    : 'border-green-200 bg-green-100 text-green-700'
                }`}
              >
                {pending ? 'در انتظار تایید' : 'تایید شده'}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-gray-500">
              {phone}
            </p>
          </div>
          <p className="text-xs font-black text-gray-900">
            {price}
            <span className="ms-1 text-[10px] font-bold text-gray-500">
              تومان
            </span>
          </p>
        </div>

        <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate text-[11px] font-bold text-gray-600">
            {service}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
          <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
            <Phone size={12} aria-hidden="true" />
            تماس
          </span>
          {pending ? (
            <span className="flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-black text-white">
                <Check size={12} aria-hidden="true" />
                تایید
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-black text-red-700">
                <XCircle size={12} aria-hidden="true" />
                رد
              </span>
            </span>
          ) : (
            <span className="flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-700">
                <XCircle size={12} aria-hidden="true" />
                لغو
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * اسکرین‌شات صفحهٔ «نوبت‌ها» — دقیقاً همان داشبورد واقعی که آرایشگر بعد از
 * ورود می‌بیند (کارت‌های آمار، فیلتر بازه، جست‌وجو و نوبت‌های گروه‌بندی‌شده
 * بر اساس روز با دکمه‌های تایید/رد/انجام شد). داده‌ها نمونه‌اند.
 */
export function AppointmentsShot({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-primary-100/70 bg-[#eef6f3] p-4 shadow-2xl shadow-primary/15 sm:p-5 ${className}`}
    >
      {/* سربرگ صفحه */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-base font-black text-gray-900">نوبت‌ها</span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-black text-white">
          <CalendarPlus size={14} aria-hidden="true" />
          ثبت نوبت دستی
        </span>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {APPT_SUMMARY.map(tile => (
          <div
            key={tile.label}
            className="rounded-2xl border border-gray-100 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[10px] font-bold text-gray-500">
                {tile.label}
              </p>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                  tile.tone === 'amber'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-primary-2 text-primary'
                }`}
              >
                <tile.icon size={14} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-base font-black text-gray-900">
              {tile.value}
            </p>
            <p className="mt-1 truncate text-[9px] font-medium text-gray-500">
              {tile.sub}
            </p>
          </div>
        ))}
      </div>

      {/* فیلتر بازه */}
      <div className="mt-3.5 flex gap-1.5">
        {APPT_FILTERS.map((filter, i) => (
          <span
            key={filter}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black ${
              i === APPT_FILTERS.length - 1
                ? 'bg-primary text-white'
                : 'border border-gray-200 bg-white text-gray-500'
            }`}
          >
            {filter}
          </span>
        ))}
      </div>

      {/* جست‌وجو */}
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] text-gray-500">
        <Search size={13} aria-hidden="true" />
        جست‌وجوی نام یا شماره مشتری...
      </div>

      {/* گروه روز اول — تایید شده */}
      <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
        <span className="rounded-md bg-primary-2 px-2 py-1 text-primary">
          روز نمونه — رزرو ثبت‌شده
        </span>
        <span className="text-gray-500">نمایش روزانه</span>
      </div>
      <div className="mt-2">
        <AppointmentRow
          time="۰۹:۰۰"
          duration="۲۰′"
          name="مشتری نمونه"
          phone="اطلاعات تماس در حساب سالن"
          service="پیرایش"
          price="—"
          status="confirmed"
          isToday
        />
      </div>

      {/* گروه روز دوم — در انتظار تایید */}
      <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
        <span className="rounded-md bg-primary-2 px-2 py-1 text-primary">
          روز نمونه — رزرو در انتظار
        </span>
        <span className="text-gray-500">نمایش روزانه</span>
      </div>
      <div className="mt-2">
        <AppointmentRow
          time="۱۰:۳۰"
          duration="۲۰′"
          name="مشتری نمونه"
          phone="اطلاعات تماس در حساب سالن"
          service="پیرایش"
          price="—"
          status="pending"
        />
      </div>
    </div>
  );
}
