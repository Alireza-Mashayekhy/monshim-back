'use client';

import {
  CalendarPlus,
  Edit,
  Phone,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import AppCard from '@/components/shared/app-card';
import CustomPagination from '@/components/shared/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PaginationMeta } from '@/services/api/types';
import type { ClubCustomer } from '@/services/features/club/types';

interface ClubCustomersListProps {
  customers?: ClubCustomer[];
  isLoading?: boolean;
  isError?: boolean;
  pagination?: PaginationMeta;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (customer: ClubCustomer) => void;
  onBook: (customer: ClubCustomer) => void;
  onDelete: (customer: ClubCustomer) => void;
  filtered?: boolean;
}

export function ClubCustomersList({
  customers,
  isLoading,
  isError,
  pagination,
  page,
  onPageChange,
  onEdit,
  onBook,
  onDelete,
  filtered = false,
}: ClubCustomersListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <AppCard key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28 mt-2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
            </div>
          </AppCard>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10 text-sm text-red-500">
        خطا در دریافت مشتریان. لطفاً مجدداً تلاش کنید.
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="size-14 rounded-full bg-primary-50 flex items-center justify-center mb-3">
          <Users size={26} className="text-primary-600" />
        </div>
        <p className="font-bold text-gray-700 text-sm">
          {filtered
            ? 'مشتری‌ای با این فیلترها یافت نشد'
            : 'هنوز مشتری ثبت نکرده‌اید'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {filtered
            ? 'فیلترها را تغییر دهید یا مشتری جدیدی اضافه کنید.'
            : 'مشتریان سالن را اضافه کنید تا بتوانید برایشان نوبت ثبت کنید.'}
        </p>
      </div>
    );
  }

  const groupName = (customer: ClubCustomer) =>
    customer.group?.name ?? 'بدون گروه';

  return (
    <>
      {/* دسکتاپ */}
      <div className="hidden lg:block bg-white rounded-sm overflow-hidden">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead>نام و نام خانوادگی</TableHead>
              <TableHead>شماره موبایل</TableHead>
              <TableHead>گروه</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map(customer => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                      <UserRound size={15} />
                    </div>
                    <span className="font-medium">
                      {customer.firstName} {customer.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell dir="ltr" className="text-right">
                  {customer.phone}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="rounded-full text-[11px] font-normal"
                  >
                    {groupName(customer)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onBook(customer)}
                      title="ثبت نوبت"
                    >
                      <CalendarPlus size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(customer)}
                      title="ویرایش"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => onDelete(customer)}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {(pagination?.totalPages ?? 1) > 1 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>
                  <CustomPagination
                    totalPages={pagination!.totalPages}
                    currentPage={page}
                    onPageChange={onPageChange}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* موبایل */}
      <div className="lg:hidden space-y-3">
        {customers.map(customer => (
          <AppCard key={customer.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-800 text-sm">
                  {customer.firstName} {customer.lastName}
                </p>
                <p
                  className="text-xs text-gray-500 mt-1 flex items-center gap-1"
                  dir="ltr"
                >
                  <Phone size={12} />
                  {customer.phone}
                </p>
                <Badge
                  variant="outline"
                  className="rounded-full text-[10px] font-normal mt-2"
                >
                  {groupName(customer)}
                </Badge>
              </div>

              <div className="flex gap-1 shrink-0">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={() => onBook(customer)}
                  title="ثبت نوبت"
                >
                  <CalendarPlus size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={() => onEdit(customer)}
                  title="ویرایش"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-lg text-red-500"
                  onClick={() => onDelete(customer)}
                  title="حذف"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </AppCard>
        ))}

        {(pagination?.totalPages ?? 1) > 1 && (
          <CustomPagination
            totalPages={pagination!.totalPages}
            currentPage={page}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </>
  );
}
