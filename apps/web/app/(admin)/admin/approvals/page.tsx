'use client';

import { useState } from 'react';

import { BarberReviewDialog } from '@/components/admin/barbers/review-dialog';
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
import { useBarberList } from '@/services/features/barber/admin.hooks';
import { BarberResponse } from '@/services/features/barber/types';

export default function AdminBarbersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useBarberList({
    search,
    page,
    limit: 10,
  });

  const barbers: BarberResponse[] = data?.data || [];

  const handleReviewClick = (id: string) => {
    setReviewId(id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold">تایید آرایشگر و ویرایش‌ها</h1>

        <Input
          placeholder="جستجو نام آرایشگر یا سالن..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:w-72"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام آرایشگر</TableHead>
              <TableHead>نام سالن</TableHead>
              <TableHead>شهر</TableHead>
              <TableHead>نوع درخواست</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  در حال دریافت اطلاعات...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && barbers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  موردی در انتظار بررسی وجود ندارد
                </TableCell>
              </TableRow>
            )}

            {barbers.map(barber => (
              <TableRow key={barber.id}>
                <TableCell className="font-medium">
                  {barber.fullName || '—'}
                </TableCell>

                <TableCell>{barber.salonName || '—'}</TableCell>

                <TableCell>{barber.cityName || '—'}</TableCell>

                <TableCell>
                  {barber.isEditReview ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      ویرایش پروفایل
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      ثبت‌نام جدید
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-left">
                  <Button
                    size="sm"
                    onClick={() => handleReviewClick(String(barber.id))}
                  >
                    بررسی و تایید
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            صفحه {data.pagination.page} از {data.pagination.totalPages}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              قبلی
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <BarberReviewDialog
        key={reviewId ?? 'closed'}
        barberId={reviewId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
