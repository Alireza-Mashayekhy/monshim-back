'use client';

import { Loader2, Percent, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatPrice } from '@/lib/utils';
import {
  useCreatePublicPageDiscount,
  useDeletePublicPageDiscount,
  usePublicPageDiscounts,
  useUpdatePublicPageDiscount,
} from '@/services/features/public-page/admin-hooks';

export default function PublicPageDiscounts() {
  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const { data, isLoading, isError, error, refetch } = usePublicPageDiscounts();
  const create = useCreatePublicPageDiscount();
  const update = useUpdatePublicPageDiscount();
  const remove = useDeletePublicPageDiscount();
  const discounts = data?.data ?? [];

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const percent = Number(percentOff);
    if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode)) {
      toast.error('کد باید ۳ تا ۳۲ حرف انگلیسی، عدد، خط تیره یا زیرخط باشد');
      return;
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      toast.error('درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد');
      return;
    }
    try {
      await create.mutateAsync({ code: cleanCode, percentOff: percent });
      setCode('');
      setPercentOff('');
      toast.success('کد تخفیف با موفقیت ساخته شد');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'ساخت کد تخفیف ناموفق بود'));
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await update.mutateAsync({ id, isActive: !isActive });
      toast.success(isActive ? 'کد تخفیف غیرفعال شد' : 'کد تخفیف فعال شد');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'تغییر وضعیت کد ناموفق بود'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('این کد تخفیف حذف شود؟')) return;
    try {
      await remove.mutateAsync(id);
      toast.success('کد تخفیف حذف شد');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'حذف کد تخفیف ناموفق بود'));
    }
  };

  return (
    <section
      className="rounded-[28px] border bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
      dir="rtl"
    >
      <div className="flex items-center gap-3 border-b border-gray-100 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary">
          <Percent size={18} />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900">
            کد تخفیف صفحهٔ عمومی
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            ساخت کدهای درصدی برای خرید صفحهٔ اختصاصی آرایشگاه
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-3 p-5 sm:grid-cols-[1fr_160px_auto]"
      >
        <Input
          dir="ltr"
          value={code}
          maxLength={32}
          autoComplete="off"
          placeholder="مثال: AUTUMN20"
          onChange={event =>
            setCode(event.target.value.replace(/\s/g, '').toUpperCase())
          }
          aria-label="کد تخفیف"
        />
        <div className="relative">
          <Input
            dir="rtl"
            type="number"
            min={1}
            max={100}
            value={percentOff}
            placeholder="درصد"
            onChange={event => setPercentOff(event.target.value)}
            aria-label="درصد تخفیف"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            ٪
          </span>
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          افزودن کد
        </Button>
      </form>

      <div className="divide-y divide-gray-100 border-t border-gray-100 px-3">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          /**
           * اگر دریافت فهرست کدها شکست بخورد، نباید وضعیت «خالی» نمایش داده شود؛
           * پیش‌تر خطای بک‌اند پشت پیام «هنوز کد تخفیفی ساخته نشده است» پنهان
           * می‌شد و مدیر فقط هنگام «افزودن کد» با خطای ۵۰۰ مواجه می‌شد.
           */
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-rose-700">
              {getApiErrorMessage(error, 'دریافت کدهای تخفیف ناموفق بود.')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              تلاش دوباره
            </Button>
          </div>
        ) : discounts.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            هنوز کد تخفیفی ساخته نشده است.
          </p>
        ) : (
          discounts.map(discount => (
            <div
              key={discount.id}
              className="flex flex-wrap items-center gap-3 p-4"
            >
              <div className="min-w-36 flex-1">
                <p
                  dir="ltr"
                  className="w-fit font-mono text-sm font-black text-gray-900"
                >
                  {discount.code}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatPrice(discount.percentOff)}٪ تخفیف از قیمت پکیج
                </p>
              </div>
              {discount.isActive ? (
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  فعال
                </Badge>
              ) : (
                <Badge variant="secondary">غیرفعال</Badge>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() =>
                  void toggleActive(discount.id, discount.isActive)
                }
              >
                {discount.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`حذف ${discount.code}`}
                disabled={remove.isPending}
                onClick={() => void handleDelete(discount.id)}
              >
                <Trash2 size={16} className="text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
