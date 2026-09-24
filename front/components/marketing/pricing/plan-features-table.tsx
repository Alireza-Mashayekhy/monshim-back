import { Check } from 'lucide-react';

import SectionHeading from '@/components/marketing/section-heading';

import { formatToman, PRICING_PLANS } from './plans-data';

/**
 * جدول تعرفه پلن‌های منشیم — قیمت و سهمیه پیامک عیناً از
 * back/src/subscription/constants.ts.
 */
const PLAN_ROWS: {
  label: string;
  value: (planKey: string) => string;
  highlight?: boolean;
}[] = [
  {
    label: 'قیمت ماهانه (تومان)',
    value: key => {
      const plan = PRICING_PLANS.find(p => p.key === key)!;
      return formatToman(plan.monthlyPrice);
    },
    highlight: true,
  },
  {
    label: 'سهمیه پیامک ماهانه (یادآوری نوبت و لینک بیعانه)',
    value: key => {
      const plan = PRICING_PLANS.find(p => p.key === key)!;
      return plan.smsCount.toLocaleString('fa-IR');
    },
    highlight: true,
  },
  {
    label: 'حجم کار پیشنهادی',
    value: key => {
      const plan = PRICING_PLANS.find(p => p.key === key)!;
      return plan.bookingsLabel.replace('مناسب ', '');
    },
  },
];

const SHARED_ROWS = [
  'نوبت دهی آنلاین و صفحه اختصاصی آرایشگاه',
  'تقویم هوشمند و ثبت نوبت دستی (حضوری و تلفنی)',
  'باشگاه مشتریان و گروه‌بندی مشتری‌ها',
  'پرداخت آنلاین با درگاه امن و کیف پول',
  'گالری نمونه‌کار و اشتراک‌گذاری لینک رزرو',
  'پشتیبانی آنلاین',
];

export default function PlanFeaturesTable() {
  return (
    <section
      aria-labelledby="pricing-comparison-heading"
      className="custom-container py-16 lg:py-24"
    >
      <SectionHeading
        id="pricing-comparison-heading"
        eyebrow="مقایسه پلن‌ها"
        title="مقایسه پلن‌های سامانه رزرو آنلاین آرایشگاه منشیم"
        description="در منشیم همه امکانات نرم افزار مدیریت آرایشگاه برای همه پلن‌ها فعال است؛ پلن مناسب را بر اساس حجم پیامک و رزرو ماهانه سالن خود انتخاب کنید."
      />

      <div className="mt-12 overflow-x-auto rounded-3xl border border-primary-100/60 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">
            جدول قیمت و سهمیه پیامک پلن‌های سامانه مدیریت آرایشگاه و نوبت دهی
            منشیم
          </caption>
          <thead>
            <tr className="border-b border-primary-100 bg-primary-2/60">
              <th
                scope="col"
                className="px-5 py-4 text-start font-extrabold text-foreground"
              >
                ویژگی
              </th>
              {PRICING_PLANS.map(plan => (
                <th
                  key={plan.key}
                  scope="col"
                  className="px-4 py-4 text-center font-extrabold text-foreground"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map(row => (
              <tr
                key={row.label}
                className="border-b border-primary-100/50 odd:bg-primary-3/50"
              >
                <th
                  scope="row"
                  className={`px-5 py-3.5 text-start font-bold leading-7 ${
                    row.highlight ? 'text-primary' : 'text-foreground/90'
                  }`}
                >
                  {row.label}
                </th>
                {PRICING_PLANS.map(plan => (
                  <td
                    key={plan.key}
                    className={`px-4 py-3.5 text-center ${
                      row.highlight
                        ? 'text-sm font-black text-primary'
                        : 'text-xs font-medium text-foreground/80'
                    }`}
                  >
                    {row.value(plan.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* امکانات مشترک */}
      <div className="mt-8 rounded-3xl border border-primary-100/60 bg-white p-6 shadow-sm lg:p-8">
        <h3 className="mb-5 text-sm font-extrabold text-foreground">
          این امکانات در همه پلن‌ها فعال است:
        </h3>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHARED_ROWS.map(item => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm leading-7 text-foreground/90"
            >
              <Check
                className="mt-1.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
