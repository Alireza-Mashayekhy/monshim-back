'use client';

import { Headphones } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AdminTicketChat } from '@/components/admin/tickets/admin-ticket-chat';
import { AdminTicketList } from '@/components/admin/tickets/admin-ticket-list';
import {
  TicketFilters,
  type TicketPriorityFilter,
  type TicketStatusFilter,
} from '@/components/shared/ticket-filters';
import { useDebounce } from '@/hooks/use-debounce';
import { useAdminTickets } from '@/services/features/ticket/hooks';

const PAGE_LIMIT = 15;

export default function AdminTicketsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatusFilter>('ALL');
  const [priority, setPriority] = useState<TicketPriorityFilter>('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(status !== 'ALL' ? { status } : {}),
      ...(priority !== 'ALL' ? { priority } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [page, status, priority, debouncedSearch],
  );

  const { data, isLoading, isError, refetch } = useAdminTickets(queryParams);

  const total = data?.pagination?.total ?? 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-2rem)]">
      {/* لیست تیکت‌ها */}
      <div
        className={`${
          selectedId ? 'hidden lg:flex' : 'flex'
        } flex-col w-full lg:w-[400px] shrink-0 bg-white rounded-lg border border-gray-200 p-3 gap-3 min-h-0`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-primary-600" />
            <h1 className="font-bold text-gray-800">تیکت‌های پشتیبانی</h1>
          </div>
          <span className="text-xs text-gray-400">
            {total > 0 ? `${total.toLocaleString('fa-IR')} تیکت` : ''}
          </span>
        </div>

        <TicketFilters
          search={search}
          onSearchChange={value => {
            setSearch(value);
            setPage(1);
          }}
          status={status}
          onStatusChange={value => {
            setStatus(value);
            setPage(1);
          }}
          priority={priority}
          onPriorityChange={value => {
            setPriority(value);
            setPage(1);
          }}
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          <AdminTicketList
            tickets={data?.data}
            isLoading={isLoading}
            isError={isError}
            pagination={data?.pagination}
            page={page}
            onPageChange={setPage}
            onSelect={setSelectedId}
            selectedId={selectedId}
            filtered={
              !!debouncedSearch.trim() || status !== 'ALL' || priority !== 'ALL'
            }
          />
        </div>
      </div>

      {/* گفتگو */}
      <div
        className={`${
          selectedId ? 'flex' : 'hidden lg:flex'
        } flex-1 min-h-0 flex-col bg-white rounded-lg border border-gray-200 overflow-hidden`}
      >
        {selectedId ? (
          <AdminTicketChat
            // با تغییر تیکت، گفتگو از نو ساخته می‌شود (پاک شدن متن پیام)
            key={selectedId}
            ticketId={selectedId}
            onBack={() => {
              setSelectedId(null);
              refetch();
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <div className="size-14 rounded-full bg-primary-50 flex items-center justify-center">
              <Headphones size={26} className="text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              یک تیکت را انتخاب کنید
            </p>
            <p className="text-xs text-gray-400 leading-6">
              پس از انتخاب تیکت، کل گفتگو را می‌بینید و می‌توانید پاسخ دهید.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
