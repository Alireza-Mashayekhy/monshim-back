'use client';

import { Gem, MessageSquare, Pencil, Wallet } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_PLAN_ICON,
  SUBSCRIPTION_PLAN_DISPLAY,
  SUBSCRIPTION_PLAN_ICONS,
} from '@/constants/subscription-plans';
import { cn, formatPrice } from '@/lib/utils';
import {
  useSubscriptionPlans,
  useUpdateSubscriptionPlan,
} from '@/services/features/subscription/hooks';
import { SubscriptionPlan } from '@/services/features/subscription/types';

import SubscriptionDialog from './subscription-dialog';

export default function SubscriptionSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data, isLoading } = useSubscriptionPlans();

  const updateMutation = useUpdateSubscriptionPlan();

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const plans = data?.data ?? [];

  return (
    <>
      <div
        className="rounded-[28px] border bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
        dir="rtl"
      >
        {/* هدر */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-2 text-primary flex items-center justify-center shrink-0">
              <Gem size={17} />
            </div>

            <div>
              <h2 className="text-sm font-black text-gray-900">اشتراک‌ها</h2>

              <p className="mt-0.5 text-xs font-medium text-gray-400">
                پلن‌ها به‌صورت پیش‌فرض تعریف شده‌اند؛ فقط قیمت و تعداد پیامک
                قابل ویرایش است.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 p-2 sm:p-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <Skeleton className="h-10 w-10 rounded-xl" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />

                  <Skeleton className="h-3 w-40" />
                </div>

                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            ))
          ) : plans.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-gray-500">
                پلنی یافت نشد؛ پلن‌ها هنگام بالا آمدن سرور به‌صورت خودکار ثبت
                می‌شوند.
              </p>
            </div>
          ) : (
            plans
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(plan => {
                const display = plan.planKey
                  ? SUBSCRIPTION_PLAN_DISPLAY[plan.planKey]
                  : null;

                const Icon = plan.planKey
                  ? (SUBSCRIPTION_PLAN_ICONS[plan.planKey] ?? DEFAULT_PLAN_ICON)
                  : DEFAULT_PLAN_ICON;

                return (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-gray-50/80"
                  >
                    <div className="flex min-w-44 flex-1 items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          display?.recommended
                            ? 'bg-primary text-white'
                            : 'bg-primary-2 text-primary',
                        )}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-black text-gray-900">
                            {display?.name ?? plan.name}
                          </p>

                          {display?.recommended && (
                            <Badge className="h-5 rounded-md bg-primary-2 px-1.5 text-[10px] font-black text-primary">
                              پیشنهاد ما
                            </Badge>
                          )}

                          {!plan.isActive && (
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-md px-1.5 text-[10px] font-bold"
                            >
                              غیرفعال
                            </Badge>
                          )}
                        </div>

                        {display?.bookingsLabel && (
                          <p className="mt-1 text-[11px] font-medium text-gray-400">
                            {display.bookingsLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* تعداد پیامک */}
                    <div className="flex min-w-24 items-center gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-2/60 text-primary">
                        <MessageSquare size={14} />
                      </div>

                      <div>
                        <p className="text-xs font-black text-gray-900">
                          {formatPrice(plan.smsCount)} پیامک
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                          اعتبار پیامک
                        </p>
                      </div>
                    </div>

                    {/* قیمت */}
                    <div className="flex min-w-32 items-center gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-2/60 text-primary">
                        <Wallet size={14} />
                      </div>

                      <div>
                        <p className="text-xs font-black text-gray-900">
                          {formatPrice(plan.price)} تومان
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                          یک‌ماهه
                        </p>
                      </div>
                    </div>

                    {/* ویرایش */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-auto shrink-0 rounded-xl"
                      disabled={updateMutation.isPending}
                      onClick={() => handleEdit(plan)}
                    >
                      <Pencil size={14} className="ml-1" />
                      ویرایش
                    </Button>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscription={editingPlan}
      />
    </>
  );
}
