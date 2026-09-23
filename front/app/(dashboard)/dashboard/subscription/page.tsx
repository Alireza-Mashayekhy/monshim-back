'use client';

import {
  CalendarDays,
  Clock,
  Gem,
  Info,
  Loader2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PLAN_ICON,
  SUBSCRIPTION_PLAN_DISPLAY,
  SUBSCRIPTION_PLAN_ICONS,
} from '@/constants/subscription-plans';
import {
  cn,
  formatPrice,
  getDurationLabel,
  toPersianDigits,
} from '@/lib/utils';
import { usePaySubscription } from '@/services/features/payment/hooks';
import {
  useActiveSubscriptionPlans,
  useCurrentUserSubscription,
} from '@/services/features/subscription/hooks';

function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function formatDate(date: string) {
  return toPersianDigits(new Date(date).toLocaleDateString('fa-IR'));
}

const DAY_MS = 24 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

let nowTick = Math.floor(Date.now() / MINUTE_MS);

function subscribeNow(onChange: () => void) {
  const id = setInterval(() => {
    nowTick = Math.floor(Date.now() / MINUTE_MS);
    onChange();
  }, 30 * 1000);

  return () => clearInterval(id);
}

function getNowSnapshot() {
  return nowTick;
}

function getNowServerSnapshot() {
  return nowTick;
}

function useNow() {
  return useSyncExternalStore(
    subscribeNow,
    getNowSnapshot,
    getNowServerSnapshot,
  );
}

export default function SubscriptionPage() {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const { data: plans, isLoading: plansLoading } = useActiveSubscriptionPlans();

  const { data: currentSubscription, isLoading: currentLoading } =
    useCurrentUserSubscription();

  const paySubscriptionMutation = usePaySubscription();

  const currentPlan = currentSubscription?.data?.subscriptionPlan ?? null;

  const displayPlans = useMemo(() => {
    const list = plans?.data ?? [];

    return list
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(plan => ({
        plan,
        display:
          (plan.planKey && SUBSCRIPTION_PLAN_DISPLAY[plan.planKey]) || null,
        icon:
          (plan.planKey && SUBSCRIPTION_PLAN_ICONS[plan.planKey]) ||
          DEFAULT_PLAN_ICON,
      }));
  }, [plans]);

  const durations = useMemo(
    () =>
      Array.from(new Set((plans?.data ?? []).map(p => p.durationDays))).sort(
        (a, b) => a - b,
      ),
    [plans],
  );

  const activeDuration = durations.includes(selectedDuration)
    ? selectedDuration
    : (durations[0] ?? 30);

  const filteredDisplayPlans = useMemo(
    () =>
      displayPlans.filter(item => item.plan.durationDays === activeDuration),
    [displayPlans, activeDuration],
  );

  const smsTotal = currentSubscription?.data?.smsTotal ?? 0;
  const smsUsed = currentSubscription?.data?.smsUsed ?? 0;
  const smsRemaining = Math.max(0, smsTotal - smsUsed);
  const smsUsedPercent =
    smsTotal > 0 ? Math.min(100, Math.round((smsUsed / smsTotal) * 100)) : 0;

  const now = useNow() * MINUTE_MS;

  const daysLeft = currentSubscription?.data?.endDate
    ? Math.ceil(
        (new Date(currentSubscription.data.endDate).getTime() - now) / DAY_MS,
      )
    : null;

  const handleUpgrade = (planId: string) => {
    if (paySubscriptionMutation.isPending) return;

    paySubscriptionMutation.mutate({ subscriptionPlanId: planId });
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
      <FadeIn delay={0.08}>
        <AppCard className="p-4 sm:p-5">
          {currentSubscription?.data ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-2 text-primary flex items-center justify-center shrink-0">
                    <Gem size={17} />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-gray-900">
                      اشتراک فعلی: {currentPlan?.name}
                    </h2>

                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      اشتراک {getDurationLabel(currentPlan?.durationDays ?? 30)}
                    </p>
                  </div>
                </div>

                <Badge className="bg-green-50 text-green-600 border border-green-200 rounded-lg h-7 px-2.5">
                  فعال
                </Badge>
              </div>

              {/* اعتبار پیامک */}
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <MessageSquare size={14} className="text-primary" />
                    اعتبار پیامک
                  </div>

                  <p className="text-xs font-bold text-gray-700">
                    <span className="text-primary text-base font-black">
                      {toPersianDigits(smsRemaining)}
                    </span>{' '}
                    پیامک باقی‌مانده از {toPersianDigits(smsTotal)}
                  </p>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      smsUsedPercent >= 90
                        ? 'bg-red-400'
                        : smsUsedPercent >= 70
                          ? 'bg-orange-400'
                          : 'bg-primary',
                    )}
                    style={{ width: `${Math.max(smsUsedPercent, 2)}%` }}
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  {toPersianDigits(smsUsed)} پیامک مصرف شده
                  {' · '}
                  {toPersianDigits(smsUsedPercent)}٪ از اعتبار استفاده شده است
                </p>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <CalendarDays size={14} className="text-primary/70" />
                  <span>
                    شروع: {formatDate(currentSubscription.data.startDate)}
                  </span>
                </div>

                <div
                  className={cn(
                    'flex items-center gap-1.5',
                    daysLeft !== null && daysLeft <= 7
                      ? 'text-red-500 font-bold'
                      : 'text-gray-500',
                  )}
                >
                  <Clock size={14} />
                  <span>
                    انقضا: {formatDate(currentSubscription.data.endDate)}
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
                      ? ` (${toPersianDigits(daysLeft)} روز باقی‌مانده)`
                      : ''}{' '}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-primary-2/60 text-primary flex items-center justify-center mx-auto">
                <Gem size={20} />
              </div>

              <h2 className="text-sm font-black text-gray-900">
                هنوز اشتراک فعالی ندارید
              </h2>

              <p className="text-xs text-gray-400">
                برای فعال‌سازی امکانات پیامکی، یکی از پلن‌های زیر را انتخاب
                کنید.
              </p>
            </div>
          )}
        </AppCard>
      </FadeIn>

      <FadeIn delay={0.16}>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900">
              پلن‌های اشتراک
            </h3>

            <p className="mt-1 text-xs text-gray-400 font-medium">
              همه پلن‌ها یک‌ماهه هستند؛ اعتبار پیامک هر پلن پس از خرید ثبت
              می‌شود.
            </p>
          </div>
        </div>

        {durations.length > 1 && (
          <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
            {durations.map(duration => (
              <button
                key={duration}
                type="button"
                onClick={() => setSelectedDuration(duration)}
                className={cn(
                  'flex-1 rounded-lg py-2.5 text-sm font-bold transition-all',
                  activeDuration === duration
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {getDurationLabel(duration)}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 lg:gap-4">
          {filteredDisplayPlans.map(({ plan, display, icon: Icon }, index) => {
            const isCurrent = currentPlan?.id === plan.id;
            const isRecommended = !!display?.recommended;
            const planName = display?.name ?? plan.name;
            const bookingsLabel = display?.bookingsLabel;
            const description = display?.description ?? plan.description;

            return (
              <FadeIn key={plan.id} delay={0.2 + index * 0.06}>
                <div
                  className={cn(
                    'relative h-full flex flex-col overflow-hidden rounded-[28px] border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(13,148,136,0.12)]',
                    isRecommended
                      ? 'border-primary/50 ring-1 ring-primary/25'
                      : 'border-gray-100',
                  )}
                >
                  {isRecommended && (
                    <div className="absolute left-0 top-0 flex items-center gap-1 rounded-br-2xl bg-primary px-3 py-1.5 text-[10px] font-black text-white">
                      <ShieldCheck size={12} />
                      پیشنهاد ما
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute left-0 top-0 rounded-br-2xl bg-green-500 px-3 py-1.5 text-[10px] font-black text-white">
                      پلن فعلی شما
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isRecommended
                          ? 'bg-primary text-white'
                          : 'bg-primary-2 text-primary',
                      )}
                    >
                      <Icon size={19} />
                    </div>
                    <h4 className="text-base font-black text-gray-900">
                      {planName}
                    </h4>{' '}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight text-gray-900">
                      {toPersianDigits(plan.smsCount)}
                    </span>

                    <span className="text-xs font-bold text-gray-400">
                      پیامک
                    </span>
                  </div>
                  {bookingsLabel && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                      <CalendarDays size={13} className="text-primary/70" />
                      {bookingsLabel}
                    </div>
                  )}

                  {description && (
                    <p className="mt-1.5 text-xs leading-6 text-gray-400">
                      {description}
                    </p>
                  )}

                  <div className="mt-auto pt-5">
                    <div className="mb-4 flex items-end justify-between rounded-2xl bg-primary-3 border border-primary-2 px-4 py-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-primary">
                          {toPersianDigits(formatPrice(plan.price))}
                        </span>

                        <span className="text-[11px] font-bold text-gray-400">
                          تومان
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-gray-400">
                        / {getDurationLabel(plan.durationDays)}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      variant={isRecommended ? 'default' : 'outline'}
                      disabled={isCurrent || paySubscriptionMutation.isPending}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {paySubscriptionMutation.isPending ? (
                        <>
                          <Loader2 className="ml-1.5 size-4 animate-spin" />
                          در حال انتقال به درگاه...
                        </>
                      ) : isCurrent ? (
                        'پلن فعلی شما'
                      ) : (
                        'خرید و پرداخت آنلاین'
                      )}
                    </Button>{' '}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </FadeIn>

      <FadeIn delay={0.5}>
        <div className="flex items-start gap-2 rounded-2xl border border-primary-2 bg-primary-3 px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />

          <p className="text-[11px] leading-6 font-medium text-gray-500">
            پیامک‌های هر پلن پس از خرید به‌عنوان اعتبار ثبت می‌شوند و با استفاده
            از آپشن‌ها (امکانات پیامکی) از این اعتبار کسر می‌گردد. اعتبار
            پیامک‌ها تا پایان دوره اشتراک قابل استفاده است.
          </p>
        </div>
      </FadeIn>
    </DashboardShell>
  );
}
