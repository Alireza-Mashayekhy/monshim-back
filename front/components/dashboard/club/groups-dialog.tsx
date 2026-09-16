'use client';

import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClubGroups,
  useCreateClubGroup,
  useDeleteClubGroup,
} from '@/services/features/club/hooks';

interface GroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupsDialog({ open, onOpenChange }: GroupsDialogProps) {
  const [name, setName] = useState('');

  const { data: groups, isLoading } = useClubGroups();
  const createGroup = useCreateClubGroup();
  const deleteGroup = useDeleteClubGroup();

  const handleCreate = async () => {
    const value = name.trim();
    if (!value || createGroup.isPending) return;

    try {
      await createGroup.mutateAsync({ name: value });
      setName('');
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این گروه اطمینان دارید؟')) return;
    try {
      await deleteGroup.mutateAsync(id);
    } catch {
      // خطا در هوک نمایش داده می‌شود
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary-600" />
            مدیریت گروه‌ها
          </DialogTitle>
          <DialogDescription>
            گروه‌بندی مشتریان باشگاه (همکار، کارکنان، بستگان، سازمانی، مشتریان
            مهم و...)
          </DialogDescription>
        </DialogHeader>

        {/* افزودن گروه */}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreate();
              }
            }}
            placeholder="نام گروه جدید"
            maxLength={100}
            className="h-9"
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || createGroup.isPending}
            className="shrink-0 h-9"
          >
            {createGroup.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} />
                افزودن
              </>
            )}
          </Button>
        </div>

        {/* لیست گروه‌ها */}
        <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))
          ) : (groups ?? []).length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">
              هنوز گروهی ساخته نشده است.
            </p>
          ) : (
            groups?.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {group.name}
                  </p>
                  {typeof group.customersCount === 'number' && (
                    <p className="text-[10px] text-gray-400">
                      {group.customersCount} مشتری
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => handleDelete(group.id)}
                  disabled={deleteGroup.isPending}
                  aria-label="حذف گروه"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
