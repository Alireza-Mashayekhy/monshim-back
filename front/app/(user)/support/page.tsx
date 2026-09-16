'use client';

import { Headphones, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { NewTicketDialog } from '@/components/pages/support/new-ticket-dialog';
import { TicketChat } from '@/components/pages/support/ticket-chat';
import { TicketList } from '@/components/pages/support/ticket-list';
import {
  TicketFilters,
  type TicketPriorityFilter,
  type TicketStatusFilter,
} from '@/components/shared/ticket-filters';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { useTickets } from '@/services/features/ticket/hooks';

const PAGE_LIMIT = 10;

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatusFilter>('ALL');
  const [priority, setPriority] = useState<TicketPriorityFilter>('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

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

  const { data, isLoading, isError, refetch } = useTickets(queryParams);

  const total = data?.pagination?.total ?? 0;

  // اگر در حال مشاهدهٔ یک تیکت هستیم، فقط صفحهٔ گفتگو نمایش داده می‌شود
  if (selectedId) {
    return (
      <TicketChat
        ticketId={selectedId}
        onBack={() => {
          setSelectedId(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="p-4">
      {/* هدر */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">پشتیبانی</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {total > 0
              ? `${total.toLocaleString('fa-IR')} تیکت`
              : 'تیکت‌های خود را اینجا پیگیری کنید'}
          </p>
        </div>
        <Button
          className="rounded-full px-4 shrink-0"
          size="lg"
          onClick={() => setNewTicketOpen(true)}
        >
          <Plus size={16} />
          تیکت جدید
        </Button>
      </div>

      {/* فیلترها */}
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
        className="mb-4"
      />

      {/* لیست تیکت‌ها */}
      <TicketList
        tickets={data?.data}
        isLoading={isLoading}
        isError={isError}
        pagination={data?.pagination}
        page={page}
        onPageChange={setPage}
        onSelect={setSelectedId}
        onCreate={() => setNewTicketOpen(true)}
        filtered={
          !!debouncedSearch.trim() || status !== 'ALL' || priority !== 'ALL'
        }
      />

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
        <Headphones size={12} />
        پاسخگویی در اسرع وقت
      </div>

      <NewTicketDialog
        open={newTicketOpen}
        onOpenChange={setNewTicketOpen}
        onCreated={ticketId => {
          if (ticketId) setSelectedId(ticketId);
        }}
      />
    </div>
  );
}
