'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDeleteSubscriptionPlan,
  useSubscriptionPlans,
  useToggleSubscriptionPlan,
} from '@/services/features/subscription/hooks';
import { formatPrice } from '@/lib/utils';
import { SubscriptionPlan } from '@/services/features/subscription/types';

import SubscriptionDialog from './subscription-dialog';

export default function SubscriptionSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data, isLoading } = useSubscriptionPlans();

  const deleteMutation = useDeleteSubscriptionPlan();

  const toggleMutation = useToggleSubscriptionPlan();

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('آیا از حذف این پلن اشتراک مطمئن هستید؟')) {
      return;
    }

    deleteMutation.mutate(id);
  };

  return (
    <>
      <div className="bg-white rounded-xl border" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-lg">اشتراک‌ها</h2>

            <p className="text-sm text-muted-foreground mt-1">
              مدیریت پلن‌های اشتراک آرایشگران
            </p>
          </div>

          <Button onClick={handleCreate}>
            <Plus className="size-4 ml-2" />
            افزودن اشتراک
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>مدت</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="w-16">عملیات</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    در حال دریافت اطلاعات...
                  </TableCell>
                </TableRow>
              ) : !data?.data?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    هنوز هیچ پلن اشتراکی ایجاد نشده است.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map(plan => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>

                    <TableCell>{formatPrice(plan.price)} تومان</TableCell>

                    <TableCell>{plan.durationDays} روز</TableCell>

                    <TableCell className="max-w-xs truncate">
                      {plan.description || '-'}
                    </TableCell>

                    <TableCell>
                      {plan.isActive ? (
                        <Badge>فعال</Badge>
                      ) : (
                        <Badge variant="secondary">غیرفعال</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            ویرایش
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => toggleMutation.mutate(plan.id)}
                          >
                            {plan.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(plan.id)}
                          >
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscription={editingPlan}
      />
    </>
  );
}
