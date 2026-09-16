// components/profile/UserCard.tsx
'use client';

import { Button } from '@/components/ui/button';
import { isoToJalali } from '@/lib/date-utils';
import { UserResponse } from '@/services/features/auth/types';

interface UserCardProps {
  user?: { data: UserResponse | null };
  onEdit: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  const jalaliBirthDate = isoToJalali(user?.data?.birthDate);

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {user?.data?.fullName || 'کاربر'}
        </h2>
        <p className="text-gray-500 text-sm font-mono dir-ltr">
          {user?.data?.phone}
        </p>
        {jalaliBirthDate && (
          <p className="text-gray-400 text-xs mt-1">🎂 {jalaliBirthDate}</p>
        )}
      </div>
      <Button onClick={onEdit}>ویرایش</Button>
    </div>
  );
};
