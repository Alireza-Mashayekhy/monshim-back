'use client';

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BadgePercent,
  Banknote,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  Search,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { useDebounce } from '@/hooks/use-debounce';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import {
  useAdminTransactions,
  useApproveAdminWithdrawal,
  useExportAdminTransactions,
  useRejectAdminWithdrawal,
} from '@/services/features/admin-transactions/hooks';
import type {
  AdminTransaction,
  AdminTransactionFilters,
  AdminTransactionSource,
  AdminTransactionStatus,
  AdminTransactionType,
} from '@/services/features/admin-transactions/types';

const PAGE_SIZE = 25;
const ALL_FILTERS = 'all';

const amountFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatToman(value: number | null | undefined) {
  return `${amountFormatter.format(Number(value) || 0)} تومان`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

function getTypeLabel(transaction: AdminTransaction) {
  if (transaction.isCustomerRefundRequest) {
    return 'بازپرداخت دستی به مشتری';
  }
  if (
    transaction.source === 'wallet' &&
    transaction.type === 'WITHDRAWAL' &&
    transaction.description?.startsWith('کسر کیف پول آرایشگر بابت لغو رزرو')
  ) {
    return 'کسر بابت لغو رزرو آرایشگر';
  }

  if (transaction.source === 'gateway') {
    switch (transaction.type) {
      case 'SUBSCRIPTION':
        return 'خرید اشتراک';
      case 'BOOKING':
        return 'پرداخت رزرو';
      case 'WALLET':
        return 'شارژ کیف پول';
      case 'PUBLIC_PAGE':
        return 'خرید صفحه اختصاصی';
      default:
        return transaction.type;
    }
  }

  switch (transaction.type) {
    case 'DEPOSIT':
      if (transaction.description?.startsWith('درآمد رزرو نوبت')) {
        return 'واریز درآمد رزرو به آرایشگر';
      }
      if (transaction.description?.includes('پاداش دعوت')) {
        return 'پاداش دعوت';
      }
      if (transaction.description?.includes('شارژ آنلاین کیف پول')) {
        return 'شارژ کیف پول';
      }
      return 'واریز به کیف پول';
    case 'WITHDRAWAL':
      return 'برداشت از کیف پول';
    case 'INCOME':
      return 'درآمد کیف پول';
    case 'REFUND':
      return 'بازگشت وجه';
    default:
      return transaction.type;
  }
}

function getStatusLabel(status: AdminTransactionStatus) {
  switch (status) {
    case 'PAID':
      return 'موفق';
    case 'COMPLETED':
      return 'انجام‌شده';
    case 'PENDING':
      return 'در انتظار';
    case 'FAILED':
      return 'ناموفق';
    case 'CANCELED':
      return 'لغوشده';
  }
}

function getStatusClass(status: AdminTransactionStatus) {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PENDING':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'FAILED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'CANCELED':
      return 'border-gray-200 bg-gray-100 text-gray-600';
  }
}

type SummaryTone = 'teal' | 'violet' | 'blue' | 'amber' | 'rose' | 'green';

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
  tone: SummaryTone;
}) {
  const toneClasses: Record<SummaryTone, string> = {
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

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<
    AdminTransactionSource | typeof ALL_FILTERS
  >(ALL_FILTERS);
  const [type, setType] = useState<AdminTransactionType | typeof ALL_FILTERS>(
    ALL_FILTERS,
  );
  const [status, setStatus] = useState<
    AdminTransactionStatus | typeof ALL_FILTERS
  >(ALL_FILTERS);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [withdrawalAction, setWithdrawalAction] = useState<{
    id: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [withdrawalNote, setWithdrawalNote] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const hasInvalidDateRange = Boolean(from && to && from > to);

  const activeFilters = useMemo<
    Omit<AdminTransactionFilters, 'page' | 'limit'>
  >(
    () => ({
      ...(source !== ALL_FILTERS ? { source } : {}),
      ...(type !== ALL_FILTERS ? { type } : {}),
      ...(status !== ALL_FILTERS ? { status } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [source, type, status, debouncedSearch, from, to],
  );
  const filters = useMemo<AdminTransactionFilters>(
    () => ({ ...activeFilters, page, limit: PAGE_SIZE }),
    [activeFilters, page],
  );
  // برای خروجی از مقدار فعلی جستجو استفاده می‌کنیم تا حتی قبل از پایان
  // debounce هم فایل دقیقاً مطابق چیزی باشد که کاربر در فیلترها دیده است.
  const exportFilters = useMemo<
    Omit<AdminTransactionFilters, 'page' | 'limit'>
  >(
    () => ({
      ...(source !== ALL_FILTERS ? { source } : {}),
      ...(type !== ALL_FILTERS ? { type } : {}),
      ...(status !== ALL_FILTERS ? { status } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [source, type, status, search, from, to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useAdminTransactions(filters, !hasInvalidDateRange);
  const exportMutation = useExportAdminTransactions();
  const approveWithdrawalMutation = useApproveAdminWithdrawal();
  const rejectWithdrawalMutation = useRejectAdminWithdrawal();
  const isReviewingWithdrawal =
    approveWithdrawalMutation.isPending || rejectWithdrawalMutation.isPending;

  const transactions = data?.data?.transactions ?? [];
  const summary = data?.data?.summary;
  const pagination = data?.pagination;

  const resetFilters = () => {
    setSearch('');
    setSource(ALL_FILTERS);
    setType(ALL_FILTERS);
    setStatus(ALL_FILTERS);
    setFrom('');
    setTo('');
    setPage(1);
  };

  const updateSource = (value: string) => {
    setSource(
      value === ALL_FILTERS ? ALL_FILTERS : (value as AdminTransactionSource),
    );
    setPage(1);
  };
  const updateType = (value: string) => {
    setType(
      value === ALL_FILTERS ? ALL_FILTERS : (value as AdminTransactionType),
    );
    setPage(1);
  };
  const updateStatus = (value: string) => {
    setStatus(
      value === ALL_FILTERS ? ALL_FILTERS : (value as AdminTransactionStatus),
    );
    setPage(1);
  };

  const handleExport = () => {
    if (hasInvalidDateRange) return;

    exportMutation.mutate(exportFilters, {
      onSuccess: () => toast.success('خروجی Excel مطابق فیلترها آماده شد.'),
      onError: exportError =>
        toast.error(
          getApiErrorMessage(exportError, 'دریافت خروجی تراکنش‌ها ناموفق بود.'),
        ),
    });
  };

  const overviewCards = [
    {
      title: 'وارد حساب ما شده',
      amount: summary?.gatewayReceivedAmount ?? 0,
      caption: 'مجموع پرداخت‌های موفق از درگاه',
      icon: CreditCard,
      tone: 'teal' as const,
    },
    {
      title: 'برای آرایشگرهاست',
      amount: summary?.barberWalletCreditsAmount ?? 0,
      caption: 'مبالغ واریزشده به کیف‌پول آرایشگران',
      icon: ArrowDownLeft,
      tone: 'amber' as const,
    },
    {
      title: 'درآمد ما',
      amount: summary?.netRevenueAmount ?? 0,
      caption: 'مجموع کمیسیون + فروش اشتراک + فروش صفحه اختصاصی',
      icon: BadgePercent,
      tone: 'violet' as const,
    },
  ];

  const detailSummaryCards = [
    {
      title: 'دریافتی موفق از درگاه',
      amount: summary?.gatewayReceivedAmount ?? 0,
      caption: `${amountFormatter.format(summary?.successfulGatewayPaymentCount ?? 0)} پرداخت موفق`,
      icon: CreditCard,
      tone: 'teal' as const,
    },
    {
      title: 'درآمد خالص سامانه',
      amount: summary?.netRevenueAmount ?? 0,
      caption: 'مجموع کمیسیون + فروش اشتراک + فروش صفحه اختصاصی',
      icon: BadgePercent,
      tone: 'violet' as const,
    },
    {
      title: 'کمیسیون رزروهای موفق',
      amount: summary?.bookingCommissionAmount ?? 0,
      caption: summary?.bookingCommissionUnknownCount
        ? `${amountFormatter.format(summary.bookingCommissionUnknownCount)} پرداخت موفقِ رزرو فاقد دادهٔ کمیسیون است`
        : 'کمیسیون ثبت‌شده برای پرداخت‌های موفق رزرو',
      icon: BadgePercent,
      tone: 'violet' as const,
    },
    {
      title: 'فروش اشتراک',
      amount: summary?.subscriptionRevenueAmount ?? 0,
      caption: 'پرداخت‌های موفق اشتراک',
      icon: CalendarDays,
      tone: 'blue' as const,
    },
    {
      title: 'فروش صفحه اختصاصی',
      amount: summary?.publicPageRevenueAmount ?? 0,
      caption: `${amountFormatter.format(summary?.publicPageCount ?? 0)} خرید صفحه اختصاصی`,
      icon: CalendarDays,
      tone: 'blue' as const,
    },
    {
      title: 'دریافتی درگاه از رزروها',
      amount: summary?.bookingPaymentsAmount ?? 0,
      caption: 'مبلغ پرداخت‌شده بابت رزروها، شامل کمیسیون',
      icon: ArrowLeftRight,
      tone: 'blue' as const,
    },
    {
      title: 'شارژ کیف پول از درگاه',
      amount: summary?.walletTopUpAmount ?? 0,
      caption: 'مبالغ شارژ کیف پول توسط کاربران',
      icon: Wallet,
      tone: 'green' as const,
    },
    {
      title: 'واریزی درآمد به آرایشگران',
      amount: summary?.barberWalletCreditsAmount ?? 0,
      caption: 'اعتبارهای ثبت‌شده بابت درآمد رزرو در کیف‌پول',
      icon: ArrowDownLeft,
      tone: 'amber' as const,
    },
    {
      title: 'برداشت‌های در انتظار',
      amount: summary?.pendingWithdrawalsAmount ?? 0,
      caption: `${amountFormatter.format(summary?.pendingWithdrawalCount ?? 0)} درخواست برداشت در انتظار بررسی`,
      icon: ArrowUpRight,
      tone: 'rose' as const,
    },
    {
      title: 'برداشت‌های انجام‌شده',
      amount: summary?.completedWithdrawalsAmount ?? 0,
      caption: 'مبالغ ثبت‌شده به‌عنوان برداشت تکمیل‌شده',
      icon: ArrowUpRight,
      tone: 'amber' as const,
    },
    {
      title: 'کسر از کیف پول آرایشگر',
      amount: summary?.barberCancellationDebitsAmount ?? 0,
      caption: `${amountFormatter.format(summary?.barberCancellationDebitCount ?? 0)} لغو با کسر مبلغ بازپرداخت‌شده به مشتری`,
      icon: ArrowUpRight,
      tone: 'violet' as const,
    },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
                تراکنش‌ها و گزارش مالی
              </h1>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                خلاصهٔ مالی سامانه را ببینید و برای بررسی کامل، جزئیات را باز
                کنید.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-11 shrink-0 gap-2 px-4"
          >
            <Link href="/admin/withdrawals">
              <Banknote className="h-4 w-4" />
              درخواست‌های برداشت
              {!!summary?.pendingWithdrawalCount && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                >
                  {amountFormatter.format(summary.pendingWithdrawalCount)}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900">خلاصه مالی</h2>
            <p className="mt-1 text-xs text-gray-500">
              سه عدد اصلی، بر اساس فیلترهای انتخابی
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-2"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
          >
            <Eye className="h-4 w-4" />
            جزئیات
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map(card => (
            <SummaryCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900">فیلتر و جستجو</h2>
            <p className="mt-1 text-xs text-gray-500">
              جستجو با نام، موبایل، شماره سفارش، کد پیگیری و شناسه مرجع
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleExport}
              loading={exportMutation.isPending}
              disabled={exportMutation.isPending || hasInvalidDateRange}
              className="h-9 gap-2"
            >
              <Download className="h-4 w-4" />
              خروجی Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-9 shrink-0 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              پاک‌کردن فیلترها
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
          <div className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="جستجوی تراکنش..."
              className="bg-white pr-9"
            />
          </div>

          <Select value={source} onValueChange={updateSource}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه منابع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTERS}>همه منابع</SelectItem>
              <SelectItem value="gateway">درگاه پرداخت</SelectItem>
              <SelectItem value="wallet">کیف پول</SelectItem>
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={updateType}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه انواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTERS}>همه انواع</SelectItem>
              <SelectItem value="BOOKING">پرداخت رزرو</SelectItem>
              <SelectItem value="SUBSCRIPTION">خرید اشتراک</SelectItem>
              <SelectItem value="PUBLIC_PAGE">خرید صفحه اختصاصی</SelectItem>
              <SelectItem value="WALLET">شارژ کیف پول</SelectItem>
              <SelectItem value="DEPOSIT">واریز کیف پول</SelectItem>
              <SelectItem value="WITHDRAWAL">برداشت کیف پول</SelectItem>
              <SelectItem value="INCOME">درآمد کیف پول</SelectItem>
              <SelectItem value="REFUND">بازگشت وجه</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTERS}>همه وضعیت‌ها</SelectItem>
              <SelectItem value="PAID">موفق (درگاه)</SelectItem>
              <SelectItem value="COMPLETED">انجام‌شده (کیف پول)</SelectItem>
              <SelectItem value="PENDING">در انتظار (برداشت)</SelectItem>
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
        <div className="mt-3 flex flex-col gap-1 text-[11px] leading-5 text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>خروجی Excel شامل همهٔ ردیف‌های مطابق فیلترهاست.</span>
          {hasInvalidDateRange && (
            <span className="font-medium text-rose-600">
              تاریخ شروع نباید بعد از تاریخ پایان باشد.
            </span>
          )}
        </div>
      </section>

      {isError && !data && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="font-semibold text-rose-800">
            {getApiErrorMessage(error, 'دریافت گزارش تراکنش‌ها ناموفق بود.')}
          </p>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            className="mt-3"
          >
            تلاش دوباره
          </Button>
        </section>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent
          dir="rtl"
          className="flex h-[85dvh] max-w-[calc(100%-1rem)] flex-col gap-4 overflow-hidden rounded-2xl p-4 sm:max-w-[95vw] sm:p-6 xl:max-w-[1400px]"
        >
          <DialogHeader className="shrink-0 pl-8">
            <DialogTitle className="text-lg font-black text-gray-900">
              جزئیات تراکنش‌ها و گزارش مالی
            </DialogTitle>
            <DialogDescription>
              همهٔ شاخص‌ها و تراکنش‌های مطابق فیلترهای انتخابی در این بخش نمایش
              داده می‌شوند.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pl-1">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-gray-900">گزارش تفصیلی مالی</h2>
                <span className="text-xs text-gray-500">
                  {amountFormatter.format(summary?.matchedCount ?? 0)} تراکنش
                  مطابق فیلترها
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {detailSummaryCards.map(card => (
                  <SummaryCard key={card.title} {...card} />
                ))}
              </div>
              <p className="rounded-xl bg-gray-50 p-3 text-[11px] leading-5 text-gray-500">
                شاخص‌های خلاصه ممکن است هم‌پوشانی داشته باشند و نباید با هم جمع
                شوند؛ مثلاً شارژ درگاه و ثبت کیف پول دو مرحله از یک جریان هستند.
                کمیسیونِ بدون دادهٔ ثبت‌شده نیز نامشخص می‌ماند و صفر فرض
                نمی‌شود.
              </p>
            </section>

            {isError && !data ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
                <p className="font-semibold text-rose-800">
                  {getApiErrorMessage(
                    error,
                    'دریافت جزئیات تراکنش‌ها ناموفق بود.',
                  )}
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
                      دفتر کامل تراکنش‌ها
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {amountFormatter.format(pagination?.total ?? 0)} تراکنش
                      مطابق فیلترها
                    </p>
                  </div>
                  {isFetching && !isLoading && (
                    <span className="text-xs text-gray-400">
                      در حال به‌روزرسانی…
                    </span>
                  )}
                </div>

                <Table dir="rtl">
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                      <TableHead>زمان</TableHead>
                      <TableHead>منبع و نوع</TableHead>
                      <TableHead>کاربر / سالن</TableHead>
                      <TableHead className="min-w-64">شرح و شناسه‌ها</TableHead>
                      <TableHead>مبلغ</TableHead>
                      <TableHead>کمیسیون</TableHead>
                      <TableHead>وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 6 }, (_, index) => (
                        <TableRow key={`loading-${index}`}>
                          {Array.from({ length: 7 }, (_, cell) => (
                            <TableCell key={cell}>
                              <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : hasInvalidDateRange ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-36 text-center text-sm text-rose-600"
                        >
                          برای نمایش تراکنش‌ها، بازهٔ تاریخ را اصلاح کنید.
                        </TableCell>
                      </TableRow>
                    ) : transactions.length ? (
                      transactions.map(transaction => {
                        const outgoing =
                          transaction.source === 'wallet' &&
                          transaction.type === 'WITHDRAWAL';
                        const pendingWithdrawal =
                          outgoing && transaction.status === 'PENDING';
                        const commissionUnknown =
                          transaction.source === 'gateway' &&
                          transaction.type === 'BOOKING' &&
                          transaction.status === 'PAID' &&
                          transaction.commissionAmount === null;
                        const estimateUnknown =
                          transaction.source === 'gateway' &&
                          transaction.type === 'BOOKING' &&
                          transaction.status === 'PENDING' &&
                          transaction.estimatedCommissionAmount === null;
                        return (
                          <TableRow
                            key={`${transaction.source}:${transaction.id}`}
                          >
                            <TableCell className="min-w-32">
                              <div className="font-medium text-gray-800">
                                {formatDateTime(transaction.createdAt)}
                              </div>
                              {transaction.paidAt &&
                                transaction.paidAt !==
                                  transaction.createdAt && (
                                  <div className="mt-1 text-[10px] text-gray-400">
                                    پرداخت: {formatDateTime(transaction.paidAt)}
                                  </div>
                                )}
                            </TableCell>
                            <TableCell className="min-w-40">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={
                                    transaction.source === 'gateway'
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : 'border-violet-200 bg-violet-50 text-violet-700'
                                  }
                                >
                                  {transaction.source === 'gateway'
                                    ? 'درگاه'
                                    : 'کیف پول'}
                                </Badge>
                              </div>
                              <p className="mt-1.5 text-xs font-semibold text-gray-700">
                                {getTypeLabel(transaction)}
                              </p>
                            </TableCell>
                            <TableCell className="min-w-40">
                              <div className="font-semibold text-gray-800">
                                {transaction.user?.fullName || '—'}
                              </div>
                              {transaction.user?.phone && (
                                <div
                                  className="mt-1 text-xs text-gray-500"
                                  dir="ltr"
                                >
                                  {transaction.user.phone}
                                </div>
                              )}
                              {transaction.user?.salonName && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {transaction.user.salonName}
                                </div>
                              )}
                              {transaction.user?.roles?.includes('admin') && (
                                <div className="mt-1 text-[10px] text-primary">
                                  مدیر سامانه
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="min-w-64 max-w-80 whitespace-normal">
                              <p className="break-words text-sm text-gray-700">
                                {transaction.description ||
                                  getTypeLabel(transaction)}
                              </p>
                              <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-400">
                                {transaction.orderId && (
                                  <p>سفارش: {transaction.orderId}</p>
                                )}
                                {transaction.trackId && (
                                  <p>پیگیری درگاه: {transaction.trackId}</p>
                                )}
                                {transaction.referenceNumber && (
                                  <p>
                                    شماره مرجع: {transaction.referenceNumber}
                                  </p>
                                )}
                                {transaction.referenceId && (
                                  <p>شناسه مرجع: {transaction.referenceId}</p>
                                )}
                                {transaction.cardNumber && (
                                  <p>کارت پرداخت: {transaction.cardNumber}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="min-w-40">
                              <div
                                className={cn(
                                  'font-bold tabular-nums',
                                  outgoing ? 'text-rose-700' : 'text-gray-900',
                                )}
                              >
                                {outgoing ? '− ' : ''}
                                {formatToman(transaction.amount)}
                              </div>
                              {transaction.serviceAmount !== null && (
                                <div className="mt-1 text-[10px] text-gray-500">
                                  مبلغ خدمات:{' '}
                                  {formatToman(transaction.serviceAmount)}
                                </div>
                              )}
                              {transaction.barberAmount !== null && (
                                <div className="mt-1 text-[10px] text-gray-500">
                                  سهم آرایشگر:{' '}
                                  {formatToman(transaction.barberAmount)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="min-w-36">
                              {transaction.commissionAmount !== null &&
                              transaction.commissionAmount > 0 ? (
                                <div className="font-bold text-emerald-700">
                                  {formatToman(transaction.commissionAmount)}
                                </div>
                              ) : transaction.estimatedCommissionAmount !==
                                  null &&
                                transaction.estimatedCommissionAmount > 0 ? (
                                <div className="text-xs font-medium text-amber-700">
                                  برآورد:{' '}
                                  {formatToman(
                                    transaction.estimatedCommissionAmount,
                                  )}
                                </div>
                              ) : commissionUnknown || estimateUnknown ? (
                                <span
                                  className="text-xs font-medium text-amber-700"
                                  title="دادهٔ کافی برای محاسبهٔ کمیسیون در پرداخت ثبت نشده است."
                                >
                                  نامشخص
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getStatusClass(transaction.status)}
                              >
                                {getStatusLabel(transaction.status)}
                              </Badge>
                              {pendingWithdrawal && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 rounded-lg bg-emerald-600 px-2 text-[10px] font-bold text-white hover:bg-emerald-700"
                                    onClick={() => {
                                      setWithdrawalNote('');
                                      setWithdrawalAction({
                                        id: transaction.id,
                                        action: 'approve',
                                      });
                                    }}
                                  >
                                    تایید واریز
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-lg border-rose-200 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                                    onClick={() => {
                                      setWithdrawalNote('');
                                      setWithdrawalAction({
                                        id: transaction.id,
                                        action: 'reject',
                                      });
                                    }}
                                  >
                                    رد
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-36 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-gray-400">
                            <ArrowLeftRight className="h-7 w-7" />
                            <p className="font-medium text-gray-600">
                              تراکنشی با این فیلترها پیدا نشد.
                            </p>
                            <p className="text-xs">
                              فیلترها را تغییر دهید یا پاک کنید.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-2 border-t border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-xs text-gray-500">
                    صفحه {amountFormatter.format(pagination?.page ?? page)} از{' '}
                    {amountFormatter.format(pagination?.totalPages ?? 1)}
                  </p>
                  <CustomPagination
                    totalPages={pagination?.totalPages ?? 1}
                    currentPage={page}
                    onPageChange={setPage}
                  />
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={withdrawalAction !== null}
        onOpenChange={open => {
          if (!open && !isReviewingWithdrawal) {
            setWithdrawalAction(null);
            setWithdrawalNote('');
          }
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {withdrawalAction?.action === 'approve'
                ? 'تایید برداشت آرایشگر'
                : 'رد درخواست برداشت'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawalAction?.action === 'approve'
                ? 'با تایید، این برداشت «انجام‌شده» ثبت می‌شود. لطفاً فقط پس از واریز واقعی وجه ادامه دهید.'
                : 'با رد کردن، مبلغ به کیف پول آرایشگر برگردانده می‌شود و تراکنش «ناموفق» ثبت می‌گردد.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="withdrawal-note"
              className="block text-xs font-medium text-gray-600"
            >
              {withdrawalAction?.action === 'approve'
                ? 'شناسه پیگیری واریز (اختیاری)'
                : 'دلیل رد (اختیاری)'}
            </label>
            <Input
              id="withdrawal-note"
              value={withdrawalNote}
              onChange={event => setWithdrawalNote(event.target.value)}
              maxLength={128}
              className="bg-white"
              placeholder={
                withdrawalAction?.action === 'approve'
                  ? 'شناسه حواله یا رسید بانکی'
                  : 'مثلاً شماره کارت نامعتبر است'
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReviewingWithdrawal}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isReviewingWithdrawal || !withdrawalAction}
              className={
                withdrawalAction?.action === 'reject'
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-primary text-white hover:bg-primary/90'
              }
              onClick={event => {
                event.preventDefault();
                if (!withdrawalAction) return;

                const onSuccess = () => {
                  toast.success(
                    withdrawalAction.action === 'approve'
                      ? 'برداشت تایید شد.'
                      : 'برداشت رد و مبلغ به کیف پول برگردانده شد.',
                  );
                  setWithdrawalAction(null);
                  setWithdrawalNote('');
                };
                const onError = (mutationError: unknown) =>
                  toast.error(
                    getApiErrorMessage(
                      mutationError,
                      'بررسی درخواست برداشت ناموفق بود.',
                    ),
                  );

                if (withdrawalAction.action === 'approve') {
                  approveWithdrawalMutation.mutate(
                    {
                      id: withdrawalAction.id,
                      transferReference: withdrawalNote,
                    },
                    { onSuccess, onError },
                  );
                } else {
                  rejectWithdrawalMutation.mutate(
                    { id: withdrawalAction.id, reason: withdrawalNote },
                    { onSuccess, onError },
                  );
                }
              }}
            >
              {isReviewingWithdrawal
                ? 'در حال ثبت…'
                : withdrawalAction?.action === 'approve'
                  ? 'تایید برداشت'
                  : 'رد و برگشت مبلغ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
