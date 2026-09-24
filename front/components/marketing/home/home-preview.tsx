import { Check, Clock, Heart, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import SectionHeading from '@/components/marketing/section-heading';

/**
 * بخش «نمونه واقعی منشیم» — بازسازی دقیق ظاهر صفحه اختصاصی آرایشگاه در اپ
 * (components/pages/barber/step1.tsx):
 * تصویر سالن با دکمه علاقه‌مندی، شیت سفید با نام + امتیاز، آدرس • شهر،
 * تب‌های خدمات / درباره ما / نظرات، لیست خدمات با چک‌باکس + مدت + قیمت تومان
 * و دکمه «ادامه و انتخاب زمان».
 */

const SAMPLE_SERVICES = [
  { name: 'اصلاح مو تخصصی', durationMinutes: 30, price: '۲۵۰٬۰۰۰' },
  { name: 'اصلاح صورت و ریش', durationMinutes: 15, price: '۱۲۰٬۰۰۰' },
  { name: 'پکیج داماد', durationMinutes: 90, price: '۱٬۲۰۰٬۰۰۰' },
] as const;

const TABS = [
  { label: 'خدمات', active: true },
  { label: 'درباره ما', active: false },
  { label: 'نظرات (۱۲)', active: false },
] as const;

export default function HomePreview() {
  return (
    <section
      aria-labelledby="home-preview-heading"
      className="bg-gradient-to-b from-background to-primary-2/50"
    >
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-preview-heading"
          title="نمونه واقعی منشیم"
          description="هر آرایشگاه در منشیم یک صفحه اختصاصی دارد؛ مشتری خدمات را انتخاب می‌کند، روز و ساعت خالی را می‌بیند و رزرو آرایشگاه در چند ثانیه انجام می‌شود."
        />

        <figure className="mx-auto mt-12 max-w-md">
          <div className="overflow-hidden rounded-[32px] border border-primary-100/70 bg-primary-3 shadow-xl shadow-primary/10">
            {/* تصویر سالن + دکمه علاقه‌مندی — مثل صفحه واقعی */}
            <div className="relative h-52">
              <Image
                src="/landing/salon-interior.jpg"
                alt="نمونه صفحه اختصاصی آرایشگاه در سامانه رزرو آنلاین منشیم"
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                className="object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-white shadow"
              >
                <Heart className="size-4 text-gray-600" />
              </span>
            </div>

            {/* شیت محتوای آرایشگاه */}
            <div className="-mt-6 rounded-t-[24px] bg-primary-3 px-5 pt-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-black text-foreground">
                  آرایشگر نمونه منشیم
                </h3>
                <p className="flex items-center gap-1 text-sm font-bold text-foreground/80">
                  <Star
                    className="size-4 fill-yellow-400 text-yellow-400"
                    aria-hidden="true"
                  />
                  ۴.۹
                </p>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                تهران، سعادت‌آباد، میدان کاج • تهران
              </p>

              {/* تب‌ها */}
              <div className="mt-4 flex border-b border-gray-200">
                {TABS.map(tab => (
                  <span
                    key={tab.label}
                    className={`relative flex-1 pb-2.5 text-center text-[13px] font-semibold ${
                      tab.active ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    {tab.label}
                    {tab.active ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-6 right-6 h-[3px] rounded-full bg-primary"
                      />
                    ) : null}
                  </span>
                ))}
              </div>

              {/* انتخاب خدمات */}
              <p className="mt-4 text-[13px] leading-6 text-foreground/80">
                خدمات مورد نظر خود را از لیست زیر انتخاب کنید. با انتخاب هر خدمت
                می‌توانید زمان مراجعه را در مرحله بعد رزرو کنید.
              </p>

              <ul className="mt-3 space-y-2.5">
                {SAMPLE_SERVICES.map(service => (
                  <li
                    key={service.name}
                    className="flex items-center justify-between gap-2 rounded-2xl border-2 border-primary/50 bg-white p-3 shadow-sm shadow-primary/5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        {service.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="size-3" aria-hidden="true" />
                        {service.durationMinutes} دقیقه
                      </span>
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-base font-black text-primary">
                        {service.price}
                      </span>
                      <span className="text-[11px] text-gray-400">تومان</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 rounded-2xl bg-primary py-3 text-center text-sm font-bold text-white">
                ادامه و انتخاب زمان
              </p>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-xs leading-6 text-muted-foreground">
            صفحه اختصاصی آرایشگاه در منشیم؛ از انتخاب خدمات تا پرداخت آنلاین و
            یادآوری پیامکی
          </figcaption>
        </figure>

        <div className="mt-8 text-center">
          <Link
            href="/register"
            title="ساخت صفحه اختصاصی آرایشگاه در منشیم"
            className="text-sm font-bold text-primary underline-offset-8 hover:underline"
          >
            صفحه آرایشگاه شما هم می‌تواند همین باشد؛ بسازید ←
          </Link>
        </div>
      </div>
    </section>
  );
}
