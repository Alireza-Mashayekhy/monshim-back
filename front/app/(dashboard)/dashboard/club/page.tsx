'use client';

import { Plus, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ClubCustomersList } from '@/components/dashboard/club/club-customers-list';
import { CustomerDialog } from '@/components/dashboard/club/customer-dialog';
import { GroupsDialog } from '@/components/dashboard/club/groups-dialog';
import { ManualBookingDialog } from '@/components/dashboard/club/manual-booking-dialog';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useClubCustomers,
  useClubGroups,
  useRemoveClubCustomer,
} from '@/services/features/club/hooks';
import type { ClubCustomer } from '@/services/features/club/types';

const PAGE_LIMIT = 10;
const ALL_GROUPS = 'all';

export default function ClubPage() {
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState<string>(ALL_GROUPS);
  const [page, setPage] = useState(1);

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ClubCustomer | null>(
    null,
  );
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const [bookingCustomer, setBookingCustomer] = useState<ClubCustomer | null>(
    null,
  );

  const debouncedSearch = useDebounce(search, 500);

  const { data: groups } = useClubGroups();
  const removeCustomer = useRemoveClubCustomer();

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      ...(groupId !== ALL_GROUPS ? { groupId } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [page, groupId, debouncedSearch],
  );

  const { data, isLoading, isError } = useClubCustomers(queryParams);

  const openAddDialog = () => {
    setEditingCustomer(null);
    setCustomerDialogOpen(true);
  };

  const openEditDialog = (customer: ClubCustomer) => {
    setEditingCustomer(customer);
    setCustomerDialogOpen(true);
  };

  const handleDelete = async (customer: ClubCustomer) => {
    const fullName = `${customer.firstName} ${customer.lastName}`;
    if (!window.confirm(`آیا از حذف «${fullName}» اطمینان دارید؟`)) return;

    try {
      await removeCustomer.mutateAsync(customer.id);
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  const total = data?.pagination?.total ?? 0;

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={22} className="text-primary-600" />
              باشگاه مشتریان
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {total > 0
                ? `${total.toLocaleString('fa-IR')} مشتری ثبت شده`
                : 'لیست مشتریان و ثبت نوبت دستی'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGroupsDialogOpen(true)}>
              مدیریت گروه‌ها
            </Button>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus size={16} />
              افزودن مشتری
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <AppCard>
          {/* فیلترها */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="جستجو در نام یا شماره موبایل..."
                className="h-10 pr-9 pl-9 rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="پاک کردن جستجو"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <Select
              value={groupId}
              onValueChange={value => {
                setGroupId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-56 h-10 rounded-xl">
                <SelectValue placeholder="همه گروه‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_GROUPS}>همه گروه‌ها</SelectItem>
                {groups?.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AppCard>
      </FadeIn>

      <FadeIn delay={0.15}>
        <ClubCustomersList
          customers={data?.data}
          isLoading={isLoading}
          isError={isError}
          pagination={data?.pagination}
          page={page}
          onPageChange={setPage}
          onEdit={openEditDialog}
          onBook={setBookingCustomer}
          onDelete={handleDelete}
          filtered={!!debouncedSearch.trim() || groupId !== ALL_GROUPS}
        />
      </FadeIn>

      {/* دیالوگ‌ها */}
      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customer={editingCustomer}
      />

      <GroupsDialog
        open={groupsDialogOpen}
        onOpenChange={setGroupsDialogOpen}
      />

      <ManualBookingDialog
        open={!!bookingCustomer}
        onOpenChange={open => {
          if (!open) setBookingCustomer(null);
        }}
        customer={bookingCustomer}
      />
    </DashboardShell>
  );
}
