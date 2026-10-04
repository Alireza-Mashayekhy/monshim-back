import { CalendarDays, type LucideIcon, Users, Wallet } from 'lucide-react';

import {
  CalendarShot,
  CustomersShot,
  WalletShot,
} from '@/components/marketing/product-ui/shots';
import SectionHeading from '@/components/marketing/section-heading';

const SHOTS: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  Shot: typeof CalendarShot;
}[] = [
  {
    id: 'calendar',
    icon: CalendarDays,
    title: 'تقویم هوشمند نوبت‌ها',
    description:
      'همهٔ نوبت‌های آنلاین و حضوری در یک نمای هفتگی؛ ساعت پر و خالی با یک نگاه.',
    Shot: CalendarShot,
  },
  {
    id: 'customers',
    icon: Users,
    title: 'باشگاه مشتریان',
    description:
      'پروندهٔ هر مشتری با سابقهٔ مراجعه و گروه‌بندی VIP، وفادار و جدید.',
    Shot: CustomersShot,
  },
  {
    id: 'wallet',
    icon: Wallet,
    title: 'کیف پول و درآمد',
    description:
      'بیعانهٔ نوبت‌ها در کیف پول می‌نشیند و هر زمان بخواهی تسویه می‌شود.',
    Shot: WalletShot,
  },
];

/**
 * بخش «خودِ محصول» — سه اسکرین‌شات از پنل منشیم.
 *
 * برای SaaS، نشان دادن خود محصول از یک نقاشی دربارهٔ محصول اطلاعات بیشتری
 * منتقل می‌کند. این قاب‌ها markup واقعی رابط کاربری منشیم‌اند (نه تصویر
 * کارتونی) و داده‌های نمونه فقط برای پرکردن قاب‌اند.
 */
export default function HomeProduct() {
  return (
    <section aria-labelledby="home-product-heading">
      <div className="custom-container py-16 lg:py-24">
        <SectionHeading
          id="home-product-heading"
          eyebrow="داخل پنل منشیم"
          title="منشیم واقعاً چه شکلی است؟"
          description="سه صفحهٔ اصلی پنل مدیریت آرایشگاه؛ همین‌ها را بعد از ثبت‌نام تحویل می‌گیری."
        />

        <div className="mt-12 space-y-14 lg:space-y-20">
          {SHOTS.map((item, index) => {
            const flipped = index % 2 === 1;
            return (
              <article
                key={item.id}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
              >
                <figure className={flipped ? 'lg:order-2' : 'lg:order-1'}>
                  <item.Shot />
                  <figcaption className="mt-3 text-center text-xs leading-6 text-muted-foreground">
                    پیش‌نمایش رابط کاربری با دادهٔ نمونه؛ اعداد، تراکنش‌ها و
                    پرونده‌های نمایشی، اطلاعات واقعی سالن‌ها نیستند.
                  </figcaption>
                </figure>

                <div
                  className={`text-center lg:text-start ${
                    flipped ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary-2 text-primary">
                    <item.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-extrabold text-foreground lg:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-8 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
