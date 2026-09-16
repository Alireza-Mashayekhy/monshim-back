'use client';

import { CalendarDays, CheckCircle, Clock, Gem, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';
import {
  useActiveSubscriptionPlans,
  useCreateUserSubscription,
  useCurrentUserSubscription,
} from '@/services/features/subscription/hooks';

type Duration = 30 | 90 | 365;

const durationTabs: {
  value: Duration;
  label: string;
}[] = [
  {
    value: 30,
    label: 'ماهانه',
  },
  {
    value: 90,
    label: 'سه ماهه',
  },
  {
    value: 365,
    label: 'سالانه',
  },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fa-IR');
}

export default function SubscriptionPage() {
  const [selectedDuration, setSelectedDuration] = useState<Duration>(30);

  const { data: plans, isLoading: plansLoading } = useActiveSubscriptionPlans();

  const { data: currentSubscription, isLoading: currentLoading } =
    useCurrentUserSubscription();

  const createSubscription = useCreateUserSubscription();

  const filteredPlans = useMemo(() => {
    if (!plans) return [];

    return plans?.data?.filter(plan => plan.durationDays === selectedDuration);
  }, [plans, selectedDuration]);

  const currentPlan = currentSubscription?.data?.subscriptionPlan ?? null;

  const handleUpgrade = (planId: string) => {
    if (createSubscription.isPending) return;

    createSubscription.mutate(planId);
  };

  if (plansLoading || currentLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* اشتراک فعلی */}
      <FadeIn>
        <AppCard className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-linear-to-br from-yellow-100 to-orange-100">
            <Gem size={32} className="text-orange-500" />
          </div>

          {currentSubscription?.data ? (
            <>
              <h2 className="text-xl font-bold text-gray-800">
                اشتراک فعلی: {currentPlan?.name}
              </h2>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <CalendarDays size={14} />

                  <span>
                    شروع: {formatDate(currentSubscription?.data.startDate)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-red-500">
                  <Clock size={14} />

                  <span>
                    انقضا: {formatDate(currentSubscription?.data.endDate)}
                  </span>
                </div>
              </div>

              {currentPlan?.description && (
                <p className="mt-3 text-sm text-gray-500">
                  {currentPlan.description}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800">
                اشتراک فعالی ندارید
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                یکی از پلن‌های زیر را انتخاب کنید.
              </p>
            </>
          )}
        </AppCard>
      </FadeIn>

      {/* تب‌ها */}
      <FadeIn delay={0.1}>
        <div className="mt-6 flex rounded-xl bg-gray-100 p-1">
          {durationTabs.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedDuration(tab.value)}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-bold transition-all',
                selectedDuration === tab.value
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* پلن‌ها */}
      <FadeIn delay={0.15}>
        <div className="mb-3 mt-6">
          <h3 className="text-lg font-bold text-gray-800">پلن‌های اشتراک</h3>

          <p className="mt-1 text-sm text-gray-500">
            پلن مناسب خود را انتخاب کنید.
          </p>
        </div>

        {filteredPlans?.length === 0 ? (
          <AppCard className="py-10 text-center">
            <p className="text-sm text-gray-500">
              برای این مدت اشتراکی وجود ندارد.
            </p>
          </AppCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {filteredPlans?.map(plan => {
              const isCurrent = currentPlan?.id === plan.id;

              return (
                <AppCard
                  key={plan.id}
                  className={cn(
                    'relative border-2 overflow-hidden',
                    isCurrent ? 'border-primary shadow-lg' : 'border-gray-100',
                  )}
                >
                  {isCurrent && (
                    <div className="absolute right-0 top-0 rounded-bl-xl  bg-primary px-3 py-1 text-xs font-bold text-white">
                      فعال
                    </div>
                  )}

                  <h4 className="mb-2 text-lg font-bold text-gray-800">
                    {plan.name}
                  </h4>

                  <div className="mb-1 flex items-end gap-1">
                    <span className="text-2xl font-black text-gray-900">
                      {formatPrice(plan.price)}
                    </span>

                    <span className="mb-1 text-xs text-gray-400">تومان</span>
                  </div>

                  <p className="mb-5 text-xs text-gray-400">
                    {selectedDuration === 30 && 'اشتراک یک ماهه'}

                    {selectedDuration === 90 && 'اشتراک سه ماهه'}

                    {selectedDuration === 365 && 'اشتراک یک ساله'}
                  </p>

                  {plan.description && (
                    <p className="mb-6 whitespace-pre-line text-sm leading-6 text-gray-500">
                      {plan.description}
                    </p>
                  )}

                  <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={15} className="text-green-500" />

                    <span>اعتبار {plan.durationDays} روز</span>
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrent ? 'secondary' : 'default'}
                    disabled={isCurrent || createSubscription.isPending}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {createSubscription.isPending ? (
                      <>
                        <Loader2 className="ml-2 size-4 animate-spin" />
                        در حال پردازش...
                      </>
                    ) : isCurrent ? (
                      'پلن فعلی'
                    ) : (
                      'انتخاب و پرداخت'
                    )}
                  </Button>
                </AppCard>
              );
            })}
          </div>
        )}
      </FadeIn>
    </DashboardShell>
  );
}
