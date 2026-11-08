'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { getApiErrorMessage } from '@/lib/api-error';
import { blogApi } from '@/services/features/blog/api';

export default function AdminBlogList() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [removeId, setRemoveId] = useState<number | null>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-blog', page, search],
    queryFn: () => blogApi.list(page, search),
  });
  const remove = useMutation({
    mutationFn: blogApi.remove,
    onSuccess: () => {
      toast.success('مقاله حذف شد');
      void client.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: e => toast.error(getApiErrorMessage(e, 'حذف مقاله ناموفق بود')),
  });
  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">مدیریت بلاگ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مقاله‌ها، پیش‌نویس‌ها و محتوای منتشرشده
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus />
            مقاله جدید
          </Link>
        </Button>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <Input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="جستجوی عنوان مقاله"
          aria-label="جستجوی مقاله"
          className="mb-4 max-w-sm"
        />
        {query.isLoading ? (
          <p>در حال دریافت مقاله‌ها...</p>
        ) : query.isError ? (
          <p role="alert" className="text-red-600">
            دریافت مقاله‌ها ناموفق بود.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان</TableHead>
                  <TableHead>نامک</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>آخرین تغییر</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.data.map(article => (
                  <TableRow key={article.id}>
                    <TableCell className="font-semibold">
                      {article.title}
                    </TableCell>
                    <TableCell dir="ltr">{article.slug}</TableCell>
                    <TableCell>
                      {article.status === 'published'
                        ? 'منتشر شده'
                        : 'پیش‌نویس'}
                      {article.featured ? ' · ویژه' : ''}
                    </TableCell>
                    <TableCell>
                      {new Date(article.updatedAt).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button asChild size="icon-sm" variant="ghost">
                          <Link
                            href={`/admin/blog/${article.id}`}
                            aria-label={`ویرایش ${article.title}`}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`حذف ${article.title}`}
                          onClick={() => setRemoveId(article.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!query.data?.data.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                مقاله‌ای یافت نشد.
              </p>
            )}
            {(query.data?.pagination.totalPages ?? 0) > 1 && (
              <CustomPagination
                totalPages={query.data!.pagination.totalPages}
                currentPage={page}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={open => {
          if (!open) setRemoveId(null);
        }}
        title="حذف مقاله"
        description="این مقاله به‌طور دائمی حذف می‌شود."
        confirmLabel="حذف مقاله"
        isPending={remove.isPending}
        onConfirm={async () => {
          if (removeId !== null) await remove.mutateAsync(removeId);
        }}
      />
    </div>
  );
}
