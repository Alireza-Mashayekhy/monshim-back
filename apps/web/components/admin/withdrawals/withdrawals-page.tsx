'use client';

import {
  Banknote,
  CheckCircle2,
  Copy,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import CustomPagination from '@/components/shared/custom-pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, toEnglishDigits } from '@/lib/utils';
import {
  useAdminWithdrawals,
  useApproveAdminWithdrawal,
  useRejectAdminWithdrawal,
} from '@/services/features/admin-withdrawals/hooks';
import type {
  AdminWithdrawal,
  AdminWithdrawalStatus,
} from '@/services/features/admin-withdrawals/types';

const PAGE_SIZE = 20;
const ALL_FILTERS = 'all';

type StatusFilter = AdminWithdrawalStatus | typeof ALL_FILTERS;
type ReviewAction = 'approve' | 'reject';

const amountFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const STATUS_META: Record<
  AdminWithdrawalStatus,
  { label: string; className: string; hint: string }
> = {
  PENDING: {
    label: 'در انتظار بررسی',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    hint: 'مبلغ از کیف پول کسر و تا تعیین وضعیت بلوکه است.',
  },
  COMPLETED: {
    label: 'تایید و واریزشده',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    hint: 'واریز به کارت آرایشگر انجام و تراکنش نهایی شده است.',
  },
  FAILED: {
    label: 'ردشده',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    hint: 'مبلغ به کیف پول آرایشگر برگردانده شده است.',
  },
};

function formatNumber(value: number | null | undefined) {
  return amountFormatter.format(Number(value) || 0);
}

function formatToman(value: number | null | undefined) {
  return `${formatNumber(value)} تومان`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(.{4})/g, '$1 ').trim() || value;
}

function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return value;
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

function formatSheba(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  const digits = normalized.replace(/^IR/, '');
  return `IR ${digits.replace(/(.{4})/g, '$1 ').trim()}`.trim();
}

async function copyToClipboard(value: string, label: string) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API is not available');
    }
    await navigator.clipboard.writeText(value);
    toast.success(`${label} کپی شد.`);
  } catch {
    toast.error('کپی در مرورگر انجام نشد.');
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`کپی ${label}`}
      title={`کپی ${label}`}
      onClick={() => void copyToClipboard(value, label)}
      className="shrink-0 text-gray-400 hover:text-primary"
    >
      <Copy />
    </Button>
  );
}

function SummaryCard({
  title,
  amount,
  caption,
  icon: Icon,
  tone,
}: {
  title: string;
  amount: number;
  caption: string;
  icon: typeof Wallet;
  tone: 'teal' | 'violet' | 'blue' | 'amber' | 'rose' | 'green';
}) {
  const toneClasses = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-lg font-black tracking-tight text-gray-900 sm:text-xl">
            {formatToman(amount)}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-gray-400">{caption}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            toneClasses[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [review, setReview] = useState<{
    withdrawal: AdminWithdrawal;
    action: ReviewAction;
  } | null>(null);
  const [note, setNote] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const hasInvalidDateRange = Boolean(from && to && from > to);

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(status !== ALL_FILTERS ? { status } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, status, debouncedSearch, from, to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useAdminWithdrawals(filters, !hasInvalidDateRange);
  const approveMutation = useApproveAdminWithdrawal();
  const rejectMutation = useRejectAdminWithdrawal();
  const isReviewing = approveMutation.isPending || rejectMutation.isPending;

  const withdrawals = data?.data.withdrawals ?? [];
  const summary = data?.data.summary;
  const pagination = data?.pagination;

  const resetFilters = () => {
    setSearch('');
    setStatus('PENDING');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(
      value === ALL_FILTERS ? ALL_FILTERS : (value as AdminWithdrawalStatus),
    );
    setPage(1);
  };

  const openReview = (withdrawal: AdminWithdrawal, action: ReviewAction) => {
    setNote('');
    setReview({ withdrawal, action });
  };

  const closeReview = () => {
    if (isReviewing) return;
    setReview(null);
    setNote('');
  };

  const submitReview = () => {
    if (!review) return;

    const { withdrawal, action } = review;
    const onSuccess = () => {
      toast.success(
        action === 'approve'
          ? 'برداشت تایید شد و در سوابق نهایی شد.'
          : 'درخواست رد شد و مبلغ به کیف پول آرایشگر برگشت.',
      );
      setReview(null);
      setNote('');
      // اگر آخرین ردیف صفحه بررسی شد، یک صفحه عقب برمی‌گردیم تا لیست خالی نماند.
      if (withdrawals.length === 1 && page > 1) setPage(page - 1);
    };
    const onError = (mutationError: unknown) => {
      toast.error(
        getApiErrorMessage(mutationError, 'بررسی درخواست برداشت ناموفق بود.'),
      );
      // ممکن است ادمین دیگری همین درخواست را بررسی کرده باشد؛ لیست را تازه
      // می‌کنیم تا وضعیت واقعی نمایش داده شود.
      void refetch();
    };

    if (action === 'approve') {
      approveMutation.mutate(
        { id: withdrawal.id, transferReference: note },
        { onSuccess, onError },
      );
    } else {
      rejectMutation.mutate(
        { id: withdrawal.id, reason: note },
        { onSuccess, onError },
      );
    }
  };

  const summaryCards = [
    {
      title: 'در انتظار بررسی',
      amount: summary?.pendingAmount ?? 0,
      caption: `${formatNumber(summary?.pendingCount ?? 0)} درخواست — مبلغ تا تعیین وضعیت بلوکه است`,
      icon: Wallet,
      tone: 'amber' as const,
    },
    {
      title: 'تایید و واریزشده',
      amount: summary?.completedAmount ?? 0,
      caption: `${formatNumber(summary?.completedCount ?? 0)} درخواست تسویه‌شده`,
      icon: CheckCircle2,
      tone: 'green' as const,
    },
    {
      title: 'ردشده و برگشتی',
      amount: summary?.rejectedAmount ?? 0,
      caption: `${formatNumber(summary?.rejectedCount ?? 0)} درخواست — مبلغ به کیف پول برگشته است`,
      icon: XCircle,
      tone: 'rose' as const,
    },
    {
      title: 'کل درخواست‌ها',
      amount: summary?.totalAmount ?? 0,
      caption: `${formatNumber(summary?.totalCount ?? 0)} درخواست برداشت ثبت‌شده`,
      icon: Banknote,
      tone: 'violet' as const,
    },
  ];

  const reviewWithdrawal = review?.withdrawal;
  const isApprove = review?.action === 'approve';

  return (
    <div className="space-y-5" dir="rtl">
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
                درخواست‌های برداشت
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                درخواست‌های برداشت آرایشگران از کیف پول را بررسی کنید. مبلغ در
                لحظهٔ ثبت درخواست از کیف پول کسر و تا تعیین وضعیت بلوکه می‌ماند؛
                تایید یعنی واریز واقعی به کارت انجام شده و رد یعنی مبلغ به کیف
                پول برگردانده می‌شود.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!!summary?.pendingCount && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
              >
                {formatNumber(summary.pendingCount)} در انتظار بررسی
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              loading={isFetching && !isLoading}
              onClick={() => void refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              به‌روزرسانی
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(card => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </div>
        <p className="text-[11px] leading-5 text-gray-400">
          آمار بالا کل درخواست‌های برداشت را نشان می‌دهد و به فیلترهای لیست
          وابسته نیست.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900">جستجو و فیلتر</h2>
            <p className="mt-1 text-xs text-gray-500">
              جستجو با نام، موبایل، نام سالن، شماره کارت، شبا یا شناسهٔ درخواست
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="shrink-0 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            پاک‌کردن فیلترها
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="جستجوی درخواست برداشت..."
              className="bg-white pr-9"
            />
          </div>

          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">در انتظار بررسی</SelectItem>
              <SelectItem value="COMPLETED">تایید و واریزشده</SelectItem>
              <SelectItem value="FAILED">ردشده</SelectItem>
              <SelectItem value={ALL_FILTERS}>همه وضعیت‌ها</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            aria-label="از تاریخ"
            value={from}
            onChange={event => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="bg-white"
          />
          <Input
            type="date"
            aria-label="تا تاریخ"
            value={to}
            onChange={event => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="bg-white"
          />
        </div>

        {hasInvalidDateRange && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            تاریخ شروع نباید بعد از تاریخ پایان باشد.
          </p>
        )}
      </section>

      {isError && !data ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="font-semibold text-rose-800">
            {getApiErrorMessage(error, 'دریافت درخواست‌های برداشت ناموفق بود.')}
          </p>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            className="mt-3"
          >
            تلاش دوباره
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-bold text-gray-900">
                {status === 'PENDING'
                  ? 'صف درخواست‌های در انتظار'
                  : 'لیست درخواست‌های برداشت'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {formatNumber(pagination?.total ?? 0)} درخواست مطابق فیلترها
              </p>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-400">در حال به‌روزرسانی…</span>
            )}
          </div>

          <Table dir="rtl">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead>متقاضی</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>کارت مقصد</TableHead>
                <TableHead>موجودی کیف پول</TableHead>
                <TableHead>زمان درخواست</TableHead>
                <TableHead className="min-w-56">توضیحات</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <TableRow key={`loading-${index}`}>
                    {Array.from({ length: 8 }, (_, cell) => (
                      <TableCell key={cell}>
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : hasInvalidDateRange ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-36 text-center text-sm text-rose-600"
                  >
                    برای نمایش درخواست‌ها، بازهٔ تاریخ را اصلاح کنید.
                  </TableCell>
                </TableRow>
              ) : withdrawals.length ? (
                withdrawals.map(withdrawal => {
                  const isPending = withdrawal.status === 'PENDING';
                  const isBarber = withdrawal.user?.roles?.includes('barber');
                  const card = withdrawal.card;

                  return (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="min-w-44">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-gray-800">
                            {withdrawal.user?.fullName || 'کاربر نامشخص'}
                          </span>
                          {isBarber && (
                            <Badge
                              variant="outline"
                              className="border-violet-200 bg-violet-50 text-[10px] text-violet-700"
                            >
                              آرایشگر
                            </Badge>
                          )}
                        </div>
                        {withdrawal.user?.phone && (
                          <div className="mt-1 text-xs text-gray-500" dir="ltr">
                            {withdrawal.user.phone}
                          </div>
                        )}
                        {withdrawal.user?.salonName && (
                          <div className="mt-1 text-xs text-gray-500">
                            {withdrawal.user.salonName}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="min-w-36">
                        <div className="font-black tabular-nums text-rose-700">
                          − {formatToman(withdrawal.amount)}
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400">
                          از کیف پول کسر شده
                        </div>
                      </TableCell>

                      <TableCell className="min-w-52">
                        {card ? (
                          <>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-700">
                                {card.bankName}
                              </span>
                              {card.isDefault && (
                                <Badge
                                  variant="outline"
                                  className="border-gray-200 bg-gray-50 text-[10px] text-gray-600"
                                >
                                  پیش‌فرض
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              <span
                                className="font-mono text-xs text-gray-800"
                                dir="ltr"
                              >
                                {maskCardNumber(card.cardNumber)}
                              </span>
                              <CopyButton
                                value={card.cardNumber}
                                label="شماره کارت"
                              />
                            </div>
                            <div className="mt-1 text-[10px] text-gray-500">
                              {card.ownerName}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-rose-600">
                            کارت بانکی حذف شده است
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="min-w-36">
                        <div
                          className={cn(
                            'font-bold tabular-nums',
                            withdrawal.walletBalance < 0
                              ? 'text-rose-600'
                              : 'text-gray-700',
                          )}
                        >
                          {formatToman(withdrawal.walletBalance)}
                        </div>
                        {withdrawal.walletBalance < 0 && (
                          <div className="mt-1 text-[10px] text-rose-500">
                            بدهی کیف پول
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="min-w-32">
                        <div className="text-xs text-gray-700">
                          {formatDateTime(withdrawal.requestedAt)}
                        </div>
                        <div
                          className="mt-1 break-all text-[10px] text-gray-400"
                          dir="ltr"
                        >
                          {withdrawal.id.slice(0, 8)}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-72 min-w-56 whitespace-normal">
                        <p className="break-words text-xs leading-5 text-gray-600">
                          {withdrawal.description || '—'}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {STATUS_META[withdrawal.status].hint}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_META[withdrawal.status].className}
                        >
                          {STATUS_META[withdrawal.status].label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {isPending ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              aria-label={`تایید برداشت ${withdrawal.user?.fullName || 'کاربر'}`}
                              className="h-7 rounded-lg bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-700"
                              onClick={() => openReview(withdrawal, 'approve')}
                            >
                              تایید واریز
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`رد درخواست برداشت ${withdrawal.user?.fullName || 'کاربر'}`}
                              className="h-7 rounded-lg border-rose-200 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                              onClick={() => openReview(withdrawal, 'reject')}
                            >
                              رد
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {withdrawal.status === 'COMPLETED'
                              ? 'تسویه شده'
                              : 'برگشت به کیف پول'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-gray-400">
                      <Banknote className="h-8 w-8" />
                      <p className="font-medium text-gray-600">
                        {status === 'PENDING'
                          ? 'درخواست برداشتی در انتظار بررسی نیست.'
                          : 'درخواستی با این فیلترها پیدا نشد.'}
                      </p>
                      <p className="text-xs">
                        {status === 'PENDING'
                          ? 'برای دیدن سوابق، وضعیت را روی «همه وضعیت‌ها» بگذارید.'
                          : 'فیلترها را تغییر دهید یا پاک کنید.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-2 border-t border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-gray-500">
              صفحه {formatNumber(pagination?.page ?? page)} از{' '}
              {formatNumber(pagination?.totalPages ?? 1)}
            </p>
            <CustomPagination
              totalPages={pagination?.totalPages ?? 1}
              currentPage={page}
              onPageChange={setPage}
            />
          </div>
        </section>
      )}

      <AlertDialog
        open={review !== null}
        onOpenChange={open => {
          if (!open) closeReview();
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isApprove ? 'تایید برداشت و ثبت واریز' : 'رد درخواست برداشت'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isApprove
                ? 'با تایید، این درخواست «تایید و واریزشده» ثبت می‌شود و از صف خارج می‌گردد و پیامک «واریز انجام شد» برای آرایشگر ارسال می‌شود. لطفاً فقط پس از واریز واقعی وجه به کارت آرایشگر ادامه دهید؛ امکان بازگشت این اقدام از پنل وجود ندارد.'
                : 'با رد کردن، مبلغ به کیف پول آرایشگر برگردانده می‌شود و تراکنش «ردشده» ثبت می‌گردد. اگر وجهی به آرایشگر واریز کرده‌اید، این درخواست را رد نکنید.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reviewWithdrawal && (
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">
                      {reviewWithdrawal.user?.fullName || 'کاربر نامشخص'}
                    </p>
                    {reviewWithdrawal.user?.salonName && (
                      <p className="mt-1 text-xs text-gray-500">
                        {reviewWithdrawal.user.salonName}
                      </p>
                    )}
                    {reviewWithdrawal.user?.phone && (
                      <p className="mt-1 text-xs text-gray-500" dir="ltr">
                        {reviewWithdrawal.user.phone}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-black tabular-nums text-gray-900">
                    {formatToman(reviewWithdrawal.amount)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-700">
                  کارت مقصد واریز
                </p>
                {reviewWithdrawal.card ? (
                  <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                    <p>
                      {reviewWithdrawal.card.bankName} —{' '}
                      {reviewWithdrawal.card.ownerName}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono text-sm font-bold tracking-wide text-gray-900"
                        dir="ltr"
                      >
                        {formatCardNumber(reviewWithdrawal.card.cardNumber)}
                      </span>
                      <CopyButton
                        value={reviewWithdrawal.card.cardNumber}
                        label="شماره کارت"
                      />
                    </div>
                    {formatSheba(reviewWithdrawal.card.shebaNumber) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px]" dir="ltr">
                          {formatSheba(reviewWithdrawal.card.shebaNumber)}
                        </span>
                        <CopyButton
                          value={reviewWithdrawal.card.shebaNumber || ''}
                          label="شماره شبا"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs leading-5 text-rose-700">
                    کارت بانکی این درخواست حذف شده است. پیش از واریز، اطلاعات
                    کارت را از آرایشگر بگیرید و در صورت رد، مبلغ به کیف پول
                    برگردانده می‌شود.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-400">موجودی فعلی کیف پول: </span>
                  <span className="font-semibold tabular-nums">
                    {formatToman(reviewWithdrawal.walletBalance)}
                  </span>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <span className="text-gray-400">تاریخ درخواست: </span>
                  <span className="font-semibold">
                    {formatDateTime(reviewWithdrawal.requestedAt)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="withdrawal-review-note">
                  {isApprove
                    ? 'شناسهٔ پیگیری واریز (اختیاری)'
                    : 'دلیل رد (اختیاری)'}
                </Label>
                {isApprove ? (
                  <Input
                    id="withdrawal-review-note"
                    value={note}
                    onChange={event =>
                      setNote(toEnglishDigits(event.target.value))
                    }
                    maxLength={128}
                    className="bg-white"
                    placeholder="شناسه حواله یا رسید بانکی"
                  />
                ) : (
                  <Textarea
                    id="withdrawal-review-note"
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    maxLength={256}
                    rows={3}
                    className="bg-white"
                    placeholder="مثلاً شماره کارت نامعتبر است"
                  />
                )}
                <p className="text-[11px] text-gray-400">
                  این یادداشت در توضیحات تراکنش ذخیره می‌شود و برای پیگیری بعدی
                  قابل استفاده است.
                </p>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReviewing}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isReviewing || !review}
              className={
                isApprove
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }
              onClick={event => {
                event.preventDefault();
                submitReview();
              }}
            >
              {isReviewing
                ? 'در حال ثبت…'
                : isApprove
                  ? 'تایید برداشت'
                  : 'رد و برگشت مبلغ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
