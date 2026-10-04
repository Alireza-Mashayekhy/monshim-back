'use client';

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
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
  useExportAdminTransactions,
  useSettleAdminRefund,
} from '@/services/features/admin-transactions/hooks';
import {
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
  const [refundPage, setRefundPage] = useState(1);
  const [refundToSettle, setRefundToSettle] = useState<AdminTransaction | null>(
    null,
  );
  const [transferReference, setTransferReference] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const hasInvalidDateRange = Boolean(from && to && from > to);
  const filters = useMemo<AdminTransactionFilters>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(source !== ALL_FILTERS ? { source } : {}),
      ...(type !== ALL_FILTERS ? { type } : {}),
      ...(status !== ALL_FILTERS ? { status } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, source, type, status, debouncedSearch, from, to],
  );
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

  const refundFilters = useMemo<AdminTransactionFilters>(
    () => ({
      page: refundPage,
      limit: 10,
      source: 'wallet',
      type: 'REFUND',
      status: 'PENDING',
    }),
    [refundPage],
  );
  const { data, isLoading, isFetching, isError, error, refetch } =
    useAdminTransactions(filters, !hasInvalidDateRange);
  const refundQuery = useAdminTransactions(refundFilters);
  const exportMutation = useExportAdminTransactions();
  const settleRefundMutation = useSettleAdminRefund();
  const transactions = data?.data?.transactions ?? [];
  const summary = data?.data?.summary;
  const pagination = data?.pagination;
  const refundTransactions =
    refundQuery.data?.data?.transactions.filter(
      transaction => transaction.isCustomerRefundRequest,
    ) ?? [];
  const refundSummary = refundQuery.data?.data?.summary;
  const refundPagination = refundQuery.data?.pagination;

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

  const summaryCards = [
    {
      title: 'دریافتی موفق از درگاه',
      amount: summary?.gatewayReceivedAmount ?? 0,
      caption: `${amountFormatter.format(summary?.successfulGatewayPaymentCount ?? 0)} پرداخت موفق`,
      icon: CreditCard,
      tone: 'teal' as const,
    },
    {
      title: 'دریافتی درگاه از رزروها',
      amount: summary?.bookingPaymentsAmount ?? 0,
      caption: 'مبلغ پرداخت‌شده بابت رزروها، شامل کمیسیون',
      icon: ArrowLeftRight,
      tone: 'blue' as const,
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
      title: 'شارژ کیف پول از درگاه',
      amount: summary?.walletTopUpAmount ?? 0,
      caption: 'درآمد ثبت‌شده به‌عنوان شارژ کیف پول',
      icon: Wallet,
      tone: 'green' as const,
    },
    {
      title: 'واریزی درآمد به آرایشگران',
      amount: summary?.barberWalletCreditsAmount ?? 0,
      caption: 'اعتبارهای ثبت‌شده بابت درآمد رزرو',
      icon: ArrowDownLeft,
      tone: 'amber' as const,
    },
    {
      title: 'کل مبالغ در انتظار',
      amount: summary?.pendingAmount ?? 0,
      caption: `${amountFormatter.format(summary?.pendingCount ?? 0)} پرداخت یا درخواست در انتظار`,
      icon: Wallet,
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
    {
      title: 'ناموفق یا لغوشده',
      amount: summary?.unsuccessfulAmount ?? 0,
      caption: `${amountFormatter.format(summary?.unsuccessfulCount ?? 0)} تراکنش ناموفق یا لغوشده`,
      icon: XCircle,
      tone: 'rose' as const,
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
                پرداخت‌های درگاه، گردش کیف پول، کمیسیون، واریزی به آرایشگران و
                برداشت‌ها را یکجا بررسی کنید.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              exportMutation.mutate(exportFilters, {
                onSuccess: () => toast.success('خروجی Excel آماده شد.'),
                onError: error =>
                  toast.error(
                    getApiErrorMessage(
                      error,
                      'دریافت خروجی تراکنش‌ها ناموفق بود.',
                    ),
                  ),
              })
            }
            loading={exportMutation.isPending}
            disabled={exportMutation.isPending || hasInvalidDateRange}
            className="h-11 shrink-0 gap-2 px-4"
          >
            <Download className="h-4 w-4" />
            خروجی Excel
          </Button>
        </div>
        <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-3 text-xs leading-6 text-gray-500 sm:px-6">
          فایل Excel واقعی (.xlsx) شامل همهٔ ردیف‌های مطابق فیلتر و دو برگهٔ
          «تراکنش‌ها» و «خلاصه مالی» است. شاخص‌های خلاصه ممکن است هم‌پوشانی
          داشته باشند و نباید با هم جمع شوند: پرداخت شارژ از درگاه و ثبت کیف پول
          دو مرحلهٔ یک جریان‌اند و برداشت‌های در انتظار زیرمجموعهٔ کل مبالغ در
          انتظارند. اگر جزئیات کمیسیون ثبت نشده باشد، مقدار نامشخص می‌ماند و صفر
          فرض نمی‌شود.
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map(card => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-amber-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900">
              بازپرداخت مشتریان در انتظار واریز
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              پس از انتقال وجه به مشتری، «ثبت واریز» را بزنید تا درخواست از صف
              خارج و در سوابق بسته شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-800"
            >
              {amountFormatter.format(refundPagination?.total ?? 0)} درخواست باز
            </Badge>
            <span className="text-sm font-black text-gray-800">
              {formatToman(refundSummary?.pendingAmount ?? 0)}
            </span>
          </div>
        </div>

        {refundQuery.isError ? (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            <p>بارگذاری صف بازپرداخت ناموفق بود.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refundQuery.refetch()}
              className="mt-2"
            >
              تلاش دوباره
            </Button>
          </div>
        ) : refundQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(item => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-gray-50"
              />
            ))}
          </div>
        ) : refundTransactions.length ? (
          <div className="space-y-2">
            {refundTransactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900">
                      {transaction.user?.fullName || 'مشتری'}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-800"
                    >
                      در انتظار واریز
                    </Badge>
                  </div>
                  {transaction.user?.phone && (
                    <p className="mt-1 text-xs text-gray-500" dir="ltr">
                      {transaction.user.phone}
                    </p>
                  )}
                  <p className="mt-1 break-all text-[11px] text-gray-400">
                    {transaction.description}
                  </p>
                  {transaction.referenceId && (
                    <p className="mt-1 break-all text-[10px] text-gray-400">
                      شناسه پرداخت: {transaction.referenceId}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <span className="font-black tabular-nums text-gray-900">
                    {formatToman(transaction.amount)}
                  </span>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setTransferReference('');
                      setRefundToSettle(transaction);
                    }}
                    disabled={settleRefundMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    ثبت واریز
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            درخواست بازپرداختِ در انتظار واریزی وجود ندارد.
          </p>
        )}

        {!!refundPagination && refundPagination.totalPages > 1 && (
          <div className="mt-4">
            <CustomPagination
              currentPage={refundPage}
              totalPages={refundPagination.totalPages}
              onPageChange={setRefundPage}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900">
              فیلتر و جستجوی تراکنش‌ها
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              جستجو با نام، موبایل، شماره سفارش، کد پیگیری و شناسه مرجع
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
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
              <SelectItem value="PAID">موفق</SelectItem>
              <SelectItem value="COMPLETED">انجام‌شده</SelectItem>
              <SelectItem value="PENDING">در انتظار</SelectItem>
              <SelectItem value="FAILED">ناموفق</SelectItem>
              <SelectItem value="CANCELED">لغوشده</SelectItem>
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
        {from && to && from > to && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            تاریخ شروع نباید بعد از تاریخ پایان باشد.
          </p>
        )}
      </section>

      {isError && !data ? (
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
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-bold text-gray-900">دفتر کامل تراکنش‌ها</h2>
              <p className="mt-1 text-xs text-gray-500">
                {amountFormatter.format(pagination?.total ?? 0)} تراکنش مطابق
                فیلترها
              </p>
            </div>
            {isFetching && !isLoading && (
              <span className="text-xs text-gray-400">در حال به‌روزرسانی…</span>
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
                    <TableRow key={`${transaction.source}:${transaction.id}`}>
                      <TableCell className="min-w-32">
                        <div className="font-medium text-gray-800">
                          {formatDateTime(transaction.createdAt)}
                        </div>
                        {transaction.paidAt &&
                          transaction.paidAt !== transaction.createdAt && (
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
                          <div className="mt-1 text-xs text-gray-500" dir="ltr">
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
                          {transaction.description || getTypeLabel(transaction)}
                        </p>
                        <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-400">
                          {transaction.orderId && (
                            <p>سفارش: {transaction.orderId}</p>
                          )}
                          {transaction.trackId && (
                            <p>پیگیری درگاه: {transaction.trackId}</p>
                          )}
                          {transaction.referenceNumber && (
                            <p>شماره مرجع: {transaction.referenceNumber}</p>
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
                            مبلغ خدمات: {formatToman(transaction.serviceAmount)}
                          </div>
                        )}
                        {transaction.barberAmount !== null && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            سهم آرایشگر: {formatToman(transaction.barberAmount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-36">
                        {transaction.commissionAmount !== null &&
                        transaction.commissionAmount > 0 ? (
                          <div className="font-bold text-emerald-700">
                            {formatToman(transaction.commissionAmount)}
                          </div>
                        ) : transaction.estimatedCommissionAmount !== null &&
                          transaction.estimatedCommissionAmount > 0 ? (
                          <div className="text-xs font-medium text-amber-700">
                            برآورد:{' '}
                            {formatToman(transaction.estimatedCommissionAmount)}
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

      <AlertDialog
        open={refundToSettle !== null}
        onOpenChange={open => {
          if (!open && !settleRefundMutation.isPending) {
            setRefundToSettle(null);
            setTransferReference('');
          }
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>ثبت واریز بازپرداخت به مشتری</AlertDialogTitle>
            <AlertDialogDescription>
              با تأیید، این درخواست از صف بازپرداخت‌های در انتظار خارج می‌شود.
              لطفاً فقط پس از انتقال واقعی وجه ادامه دهید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {refundToSettle && (
            <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
              <p className="font-bold text-gray-800">
                {refundToSettle.user?.fullName || 'مشتری'}
              </p>
              <p className="font-black text-gray-900">
                {formatToman(refundToSettle.amount)}
              </p>
              <label
                htmlFor="refund-transfer-reference"
                className="block pt-2 text-xs font-medium text-gray-600"
              >
                شماره پیگیری واریز (اختیاری)
              </label>
              <Input
                id="refund-transfer-reference"
                value={transferReference}
                onChange={event => setTransferReference(event.target.value)}
                maxLength={128}
                placeholder="شناسه حواله یا رسید بانکی"
                className="bg-white"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settleRefundMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={settleRefundMutation.isPending || !refundToSettle}
              onClick={event => {
                event.preventDefault();
                if (!refundToSettle) return;
                settleRefundMutation.mutate(
                  { id: refundToSettle.id, transferReference },
                  {
                    onSuccess: () => {
                      toast.success('واریز بازپرداخت ثبت شد.');
                      setRefundToSettle(null);
                      setTransferReference('');
                    },
                    onError: error =>
                      toast.error(
                        getApiErrorMessage(
                          error,
                          'ثبت واریز بازپرداخت ناموفق بود.',
                        ),
                      ),
                  },
                );
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {settleRefundMutation.isPending
                ? 'در حال ثبت…'
                : 'تأیید و ثبت واریز'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
