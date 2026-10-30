'use client';

import { Pause, Play, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import CustomPagination from '@/components/shared/custom-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useDeleteBarberProfile,
  useSetBarberActive,
  useAdminBarberManagementList,
} from '@/services/features/barber/admin.hooks';
import type { BarberResponse } from '@/services/features/barber/types';

type BarberAction =
  | { type: 'deactivate' | 'activate'; barber: BarberResponse }
  | { type: 'delete'; barber: BarberResponse };

export default function AdminBarbersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<BarberAction | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useAdminBarberManagementList({
    page,
    limit: 10,
    search: debouncedSearch,
  });
  const setBarberActive = useSetBarberActive();
  const deleteBarber = useDeleteBarberProfile();
  const barbers = data?.data ?? [];
  const actionPending =
    action?.type === 'delete'
      ? deleteBarber.isPending
      : setBarberActive.isPending;

  const handleConfirm = async () => {
    if (!action) return;
    if (action.type === 'delete') {
      await deleteBarber.mutateAsync({
        id: action.barber.id,
        slug: action.barber.slug,
      });
    } else {
      await setBarberActive.mutateAsync({
        id: action.barber.id,
        isActive: action.type === 'activate',
      });
    }
    setAction(null);
  };

  const dialogTitle =
    action?.type === 'delete'
      ? 'حذف دائمی آرایشگر'
      : action?.type === 'deactivate'
        ? 'غیرفعال‌کردن آرایشگر'
        : 'فعال‌کردن آرایشگر';

  const dialogDescription = action
    ? action.type === 'delete'
      ? `آیا از حذف دائمی «${action.barber.fullName || action.barber.salonName}» مطمئن هستید؟ اگر سابقهٔ رزرو، پرداخت یا تراکنش داشته باشد، برای حفظ سوابق امکان حذف وجود ندارد و باید آن را غیرفعال کنید.`
      : action.type === 'deactivate'
        ? `آرایشگاه «${action.barber.salonName}» از فهرست‌های کاربران و صفحه‌های عمومی پنهان می‌شود؛ اطلاعات و سوابق آن حفظ می‌شود و هر زمان می‌توانید دوباره فعالش کنید.`
        : `آرایشگاه «${action.barber.salonName}» دوباره در فهرست‌ها و صفحه‌های عمومی نمایش داده خواهد شد.`
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">مدیریت آرایشگرها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            وضعیت نمایش عمومی آرایشگرها را مدیریت کنید یا در صورت نداشتن سابقه،
            آن‌ها را حذف کنید.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search
            aria-hidden="true"
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="جست‌وجوی نام، سالن یا شماره"
            className="bg-white pr-9"
            aria-label="جست‌وجوی آرایشگرها"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">شناسه</TableHead>
              <TableHead>آرایشگر و سالن</TableHead>
              <TableHead>شماره تماس</TableHead>
              <TableHead>شهر</TableHead>
              <TableHead>وضعیت پروفایل</TableHead>
              <TableHead>وضعیت نمایش</TableHead>
              <TableHead className="min-w-52">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  در حال دریافت فهرست آرایشگرها…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-destructive"
                >
                  دریافت فهرست آرایشگرها ناموفق بود. صفحه را بازخوانی کنید.
                </TableCell>
              </TableRow>
            ) : barbers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  آرایشگری پیدا نشد.
                </TableCell>
              </TableRow>
            ) : (
              barbers.map(barber => (
                <TableRow key={barber.id}>
                  <TableCell className="text-center">{barber.id}</TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {barber.fullName || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {barber.salonName || 'بدون نام سالن'}
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {barber.phone || '—'}
                  </TableCell>
                  <TableCell>{barber.cityName || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        barber.isApproved
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {barber.isApproved ? 'تاییدشده' : 'تاییدنشده'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        barber.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {barber.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {barber.isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAction({ type: 'deactivate', barber })
                          }
                        >
                          <Pause className="ml-1 size-3.5" />
                          غیرفعال
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAction({ type: 'activate', barber })
                          }
                        >
                          <Play className="ml-1 size-3.5" />
                          فعال‌سازی
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setAction({ type: 'delete', barber })}
                      >
                        <Trash2 className="ml-1 size-3.5" />
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomPagination
        totalPages={data?.pagination?.totalPages ?? 1}
        currentPage={page}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={open => {
          if (!open && !actionPending) setAction(null);
        }}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={
          action?.type === 'delete'
            ? 'حذف دائمی'
            : action?.type === 'deactivate'
              ? 'غیرفعال‌کردن'
              : 'فعال‌کردن'
        }
        pendingLabel="در حال انجام…"
        onConfirm={handleConfirm}
        isPending={actionPending}
        destructive={action?.type !== 'activate'}
      />
    </div>
  );
}
