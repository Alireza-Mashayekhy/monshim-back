// app/profile/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { EditProfileModal } from '@/components/pages/profile/editProfileModal';
import { FeedbackModal } from '@/components/pages/profile/feedBackModal';
import { SettingsMenu } from '@/components/pages/profile/settingMenu';
import { UserCard } from '@/components/pages/profile/userCard';
import { getApiErrorMessage } from '@/lib/api-error';
import { useLogout, useMe } from '@/services/features/auth/hooks';

export default function ProfilePage() {
  const { data: user } = useMe();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const logoutMutation = useLogout();
  const router = useRouter();

  const logout = async () => {
    if (logoutMutation.isPending) return;
    try {
      await logoutMutation.mutateAsync();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'خروج انجام نشد. دوباره تلاش کنید.'),
      );
    }
  };

  return (
    <div className="p-5 pb-24">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">پروفایل من</h1>

      <UserCard user={user} onEdit={() => setShowEditModal(true)} />

      <SettingsMenu
        onFeedback={() => setShowFeedbackModal(true)}
        onSupport={() => {}}
        onShare={() => {}}
        onLogout={logout}
      />

      <div className="mt-8 text-center text-xs text-gray-400">
        نسخه ۱.۳.۰ | توسعه داده شده با ❤️
      </div>

      <EditProfileModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        user={user}
      />

      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />
    </div>
  );
}
