'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  stripNumericSeparators,
} from '@/lib/digits';
import {
  type CommissionMode,
  type CommissionTier,
  computeProgressiveCommission,
  DEFAULT_COMMISSION_MAX_AMOUNT,
  DEFAULT_COMMISSION_TIERS,
  normalizeCommissionTiers,
} from '@/lib/order-pricing';
import { toPersianDigits } from '@/lib/utils';
import {
  useSiteSettings,
  useUpdateSiteSettings,
} from '@/services/features/settings/hooks';

interface TierDraftRow {
  upTo: string;
  percent: string;
}

const SAMPLE_AMOUNTS = [
  300_000,
  500_000,
  1_000_000,
  2_000_000,
  3_000_000,
  4_000_000,
];

function sanitizePercentInput(value: string): string {
  const sanitized = sanitizeDecimalInput(value, 2);
  if (!sanitized) return '';
  const num = parseFloat(sanitized);
  if (Number.isNaN(num)) return '';
  if (num > 100) return '100';
  return sanitized;
}

function formatThousandNumber(value: string | number): string {
  const digits = sanitizeIntegerInput(value);
  return digits ? Number(digits).toLocaleString('en-US') : '';
}

function tiersToDraftRows(tiers: readonly CommissionTier[]): TierDraftRow[] {
  return tiers.map(tier => ({
    upTo:
      tier.upTo !== null && tier.upTo !== undefined
        ? formatThousandNumber(tier.upTo)
        : '',
    percent: String(tier.percent),
  }));
}

export default function FinancialSettings() {
  const { data, isLoading } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();

  const [depositPercentDraft, setDepositPercentDraft] = useState<string | null>(
    null,
  );
  const [flatPercentDraft, setFlatPercentDraft] = useState<string | null>(null);
  const [commissionModeDraft, setCommissionModeDraft] =
    useState<CommissionMode | null>(null);
  const [maxAmountDraft, setMaxAmountDraft] = useState<string | null>(null);
  const [tiersDraft, setTiersDraft] = useState<TierDraftRow[] | null>(null);

  const serverSettings = data?.data;

  const depositPercent =
    depositPercentDraft ??
    (serverSettings?.depositPercent !== undefined
      ? String(serverSettings.depositPercent)
      : '30');

  const flatCommissionPercent =
    flatPercentDraft ??
    (serverSettings?.commissionPercent !== undefined
      ? String(serverSettings.commissionPercent)
      : '10');

  const commissionMode: CommissionMode =
    commissionModeDraft ??
    (serverSettings?.commissionMode === 'flat' ? 'flat' : 'tiered');

  const maxAmountFormatted =
    maxAmountDraft ??
    (serverSettings?.commissionMaxAmount === undefined
      ? formatThousandNumber(DEFAULT_COMMISSION_MAX_AMOUNT)
      : serverSettings.commissionMaxAmount !== null &&
          serverSettings.commissionMaxAmount > 0
        ? formatThousandNumber(serverSettings.commissionMaxAmount)
        : '');

  const activeTierRows: TierDraftRow[] = useMemo(() => {
    if (tiersDraft) return tiersDraft;
    const normalized = normalizeCommissionTiers(
      serverSettings?.commissionTiers,
    );
    return tiersToDraftRows(normalized);
  }, [tiersDraft, serverSettings?.commissionTiers]);

  const parsedPreviewOptions = useMemo(() => {
    const rawMax = stripNumericSeparators(maxAmountFormatted);
    const parsedMax = rawMax ? Number(rawMax) : null;
    const parsedTiers: CommissionTier[] = activeTierRows.map((row, idx) => {
      const isLast = idx === activeTierRows.length - 1;
      const cleanUpTo = stripNumericSeparators(row.upTo);
      const upToNum = cleanUpTo ? Number(cleanUpTo) : null;
      return {
        upTo: isLast ? null : upToNum,
        percent: Number(stripNumericSeparators(row.percent) || 0),
      };
    });

    return {
      commissionMode,
      commissionTiers: parsedTiers,
      commissionMaxAmount:
        parsedMax && Number.isFinite(parsedMax) && parsedMax > 0
          ? parsedMax
          : null,
      commissionPercent: Number(
        stripNumericSeparators(flatCommissionPercent) || 0,
      ),
    };
  }, [
    activeTierRows,
    commissionMode,
    flatCommissionPercent,
    maxAmountFormatted,
  ]);

  const handleTierChange = (
    index: number,
    field: 'upTo' | 'percent',
    rawValue: string,
  ) => {
    const next = activeTierRows.map(row => ({ ...row }));
    if (field === 'upTo') {
      next[index].upTo = formatThousandNumber(rawValue);
    } else {
      next[index].percent = sanitizePercentInput(rawValue);
    }
    setTiersDraft(next);
  };

  const handleAddTier = () => {
    const next = activeTierRows.map(row => ({ ...row }));
    const insertIndex = Math.max(0, next.length - 1);
    const prevUpToDigits =
      insertIndex > 0
        ? Number(stripNumericSeparators(next[insertIndex - 1].upTo) || 0)
        : 0;
    const suggestedUpTo = prevUpToDigits + 1_000_000;
    next.splice(insertIndex, 0, {
      upTo: formatThousandNumber(suggestedUpTo),
      percent: '5',
    });
    setTiersDraft(next);
  };

  const handleRemoveTier = (index: number) => {
    if (activeTierRows.length <= 2) {
      toast.error('حداقل دو پله برای مدل پلکانی لازم است');
      return;
    }
    const next = activeTierRows.filter((_, idx) => idx !== index);
    next[next.length - 1] = {
      ...next[next.length - 1],
      upTo: '',
    };
    setTiersDraft(next);
  };

  const handleResetDefaults = () => {
    setCommissionModeDraft('tiered');
    setMaxAmountDraft(formatThousandNumber(DEFAULT_COMMISSION_MAX_AMOUNT));
    setTiersDraft(tiersToDraftRows(DEFAULT_COMMISSION_TIERS));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTiers: CommissionTier[] = [];
    if (commissionMode === 'tiered') {
      let previousUpper = 0;
      for (let i = 0; i < activeTierRows.length; i++) {
        const isLast = i === activeTierRows.length - 1;
        const row = activeTierRows[i];
        const percent = Number(stripNumericSeparators(row.percent));
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          toast.error(`درصد پلهٔ شمارهٔ ${i + 1} معتبر نیست`);
          return;
        }

        if (isLast) {
          parsedTiers.push({ upTo: null, percent });
        } else {
          const upTo = Number(stripNumericSeparators(row.upTo));
          if (!Number.isFinite(upTo) || upTo <= previousUpper) {
            toast.error(
              `سقف مبلغ در پلهٔ شمارهٔ ${i + 1} باید بزرگ‌تر از پلهٔ قبلی باشد`,
            );
            return;
          }
          previousUpper = upTo;
          parsedTiers.push({ upTo, percent });
        }
      }
    }

    const rawMax = stripNumericSeparators(maxAmountFormatted);
    const parsedMax = rawMax ? Number(rawMax) : null;

    updateMutation.mutate({
      depositPercent: Number(stripNumericSeparators(depositPercent) || 0),
      commissionPercent: Number(
        stripNumericSeparators(flatCommissionPercent) || 0,
      ),
      commissionMode,
      commissionTiers:
        commissionMode === 'tiered' ? parsedTiers : undefined,
      commissionMaxAmount:
        parsedMax && Number.isFinite(parsedMax) && parsedMax > 0
          ? Math.round(parsedMax)
          : null,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5" dir="rtl">
        در حال دریافت تنظیمات...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border" dir="rtl">
      <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">تنظیمات مالی و کمیسیون</h2>
          <p className="text-sm text-muted-foreground mt-1">
            مدل محاسبهٔ کمیسیون رزرو آنلاین (پلکانی حاشیه‌ای + سقف هر رزرو) را
            مدیریت کنید.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetDefaults}
          className="gap-1.5 self-start"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          بازگردانی به استاندارد (۱۰٪/۷٪/۵٪/۳٪ + سقف ۲۰۰ هزار)
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>مدل محاسبه کمیسیون</Label>
            <select
              value={commissionMode}
              onChange={e =>
                setCommissionModeDraft(e.target.value as CommissionMode)
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="tiered">پلکانی کاهشی (پیشنهادی)</option>
              <option value="flat">درصد ثابت</option>
            </select>
            <p className="text-xs text-muted-foreground">
              در حالت پلکانی، درصد هر پله فقط روی مازاد همان بازه اعمال می‌شود.
            </p>
          </div>

          <div className="space-y-2">
            <Label>سقف کمیسیون هر رزرو (تومان)</Label>
            <Input
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="مثلاً 200,000 (خالی = بدون سقف)"
              value={maxAmountFormatted}
              onChange={e => {
                setMaxAmountDraft(formatThousandNumber(e.target.value));
              }}
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              حداکثر مبلغ کمیسیون دریافتی در یک نوبت (پیش‌فرض ۲۰۰٬۰۰۰ تومان).
            </p>
          </div>

          <div className="space-y-2">
            <Label>درصد پیش‌فرض بیعانه</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={depositPercent}
                onChange={e =>
                  setDepositPercentDraft(sanitizePercentInput(e.target.value))
                }
                className="pl-10 text-left"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              درصد بیعانهٔ پیش‌فرض سامانه.
            </p>
          </div>
        </div>

        {commissionMode === 'tiered' ? (
          <div className="space-y-3 rounded-xl border bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">پله‌های کمیسیون حاشیه‌ای</h3>
                <p className="text-xs text-muted-foreground">
                  مبنای محاسبه: جمع مبلغ پرداخت آنلاین نوبت (بیعانه‌ها یا مبلغ کل
                  خدماتِ بدون بیعانه).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTier}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن پله
              </Button>
            </div>

            <div className="space-y-2.5">
              {activeTierRows.map((row, idx) => {
                const isLast = idx === activeTierRows.length - 1;
                const fromLabel =
                  idx === 0
                    ? '۰'
                    : toPersianDigits(activeTierRows[idx - 1].upTo || '—');

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-lg border bg-white p-3"
                  >
                    <div className="sm:col-span-3 text-xs font-medium text-gray-600">
                      پله {toPersianDigits(idx + 1)}: از {fromLabel} تومان
                    </div>

                    <div className="sm:col-span-5">
                      {isLast ? (
                        <div className="h-9 flex items-center rounded-md border border-dashed bg-muted/40 px-3 text-xs text-muted-foreground">
                          به بالا (مازاد بر پلهٔ قبلی تا سقف کمیسیون)
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            placeholder="سقف بازه (تومان)"
                            value={row.upTo}
                            onChange={e =>
                              handleTierChange(idx, 'upTo', e.target.value)
                            }
                            className="pl-14 text-left"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            تومان
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-3 relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        placeholder="درصد"
                        value={row.percent}
                        onChange={e =>
                          handleTierChange(idx, 'percent', e.target.value)
                        }
                        className="pl-8 text-left"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {!isLast && activeTierRows.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTier(idx)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-sm space-y-2">
            <Label>درصد ثابت کمیسیون</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={flatCommissionPercent}
                onChange={e =>
                  setFlatPercentDraft(sanitizePercentInput(e.target.value))
                }
                className="pl-10 text-left"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        )}

        {/* پیش‌نمایش زنده خروجی پله‌ها */}
        <div className="rounded-xl border bg-slate-50/40 p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-700">
            پیش‌نمایش زندهٔ کمیسیون روی مبالغ نمونه:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {SAMPLE_AMOUNTS.map(amount => {
              const sample = computeProgressiveCommission(
                amount,
                parsedPreviewOptions,
              );
              return (
                <div
                  key={amount}
                  className="rounded-lg border bg-white p-2.5 text-xs space-y-1"
                >
                  <div className="text-muted-foreground">
                    نوبت{' '}
                    {toPersianDigits(amount.toLocaleString('en-US'))} تومانی
                  </div>
                  <div className="font-bold text-primary">
                    {toPersianDigits(
                      sample.commissionAmount.toLocaleString('en-US'),
                    )}{' '}
                    تومان
                  </div>
                  <div className="text-[11px] text-gray-500">
                    نرخ مؤثر:{' '}
                    {toPersianDigits(
                      Number(sample.commissionPercent.toFixed(2)).toString(),
                    )}
                    ٪{sample.isCommissionCapped ? ' (سقف)' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </Button>
        </div>
      </form>
    </div>
  );
}
