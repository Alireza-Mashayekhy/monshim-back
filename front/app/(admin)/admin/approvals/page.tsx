'use client';

import { MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';

import { BarberReviewDialog } from '@/components/admin/barbers/review-dialog';
import CustomPagination from '@/components/shared/custom-pagination';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { useBarberList } from '@/services/features/barber/admin.hooks';
import { BarberResponse } from '@/services/features/barber/types';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const { data } = useBarberList({
    page,
    search: debouncedSearch,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        {/* <Button size="lg">افزودن</Button> */}
        <span />
        <Input
          placeholder="جستجو"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="bg-white w-96"
        />
      </div>
      <div className="bg-white rounded-sm overflow-hidden">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">آیدی</TableHead>
              <TableHead>نام و نام خانوادگی</TableHead>
              <TableHead>نام سالن</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.map((barber: BarberResponse) => (
              <TableRow key={barber.id}>
                <TableCell className="text-center">{barber.id}</TableCell>
                <TableCell>{barber.fullName}</TableCell>
                <TableCell>{barber.salonName}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedBarberId(barber.id);
                          setReviewDialogOpen(true);
                        }}
                      >
                        بررسی پروفایل
                      </DropdownMenuItem>{' '}
                      <DropdownMenuItem variant="destructive">
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={6}>
                <CustomPagination
                  totalPages={data?.pagination?.totalPages ?? 1}
                  currentPage={page}
                  onPageChange={setPage}
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <BarberReviewDialog
          barberId={selectedBarberId}
          open={reviewDialogOpen}
          onOpenChange={open => {
            setReviewDialogOpen(open);

            if (!open) {
              setSelectedBarberId(null);
            }
          }}
        />
      </div>
    </div>
  );
}
