'use client';

import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { UserResponse } from '@/services/features/auth/types';

interface ProfileCardProps {
  user?: UserResponse | null;
  onEdit: () => void;
}

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  const name = user?.fullName || 'کاربر';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex justify-end mb-4">
        <span className="bg-primary-2 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20">
          پروفایل من
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary-2 border-4 border-white shadow-sm ring-1 ring-primary/20 flex items-center justify-center text-primary font-black text-2xl overflow-hidden">
          {name.charAt(0)}
        </div>
        <h2 className="mt-3 text-base font-black text-gray-900">{name}</h2>
        {user?.phone && (
          <p className="text-xs text-gray-400 mt-1 dir-ltr font-mono">
            {user.phone}
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={onEdit}
        className="w-full mt-4 gap-2 bg-primary-2 text-primary hover:bg-primary-2/70 border border-primary/20"
      >
        <Pencil size={15} />
        ویرایش اطلاعات پروفایل
      </Button>
    </div>
  );
}
