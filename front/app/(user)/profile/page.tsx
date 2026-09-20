// app/profile/page.tsx
'use client';

import {
  FileText,
  Headphones,
  LogOut,
  MapPin,
  MessageSquareWarning,
  Phone,
  ScrollText,
  Send,
  ShieldCheck,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AddressModal } from '@/components/pages/profile/address-modal';
import { ChangePasswordModal } from '@/components/pages/profile/change-password-modal';
import { EditProfileModal } from '@/components/pages/profile/editProfileModal';
import { FeedbackModal } from '@/components/pages/profile/feedBackModal';
import { ProfileCard } from '@/components/pages/profile/profile-card';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { useLogout, useMe } from '@/services/features/auth/hooks';

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-1.5">
      <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
    </div>
  );
}

function RowAction({
  icon,
  label,
  description,
  value,
  onClick,
  href,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const content = (
    <>
      <div
        className={`flex items-center gap-2.5 min-w-0 ${
          description ? 'items-start' : ''
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            danger ? 'bg-red-50 text-red-500' : 'bg-primary-2/60 text-primary'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 text-right">
          <p
            className={`text-xs font-bold ${
              danger ? 'text-red-600' : 'text-gray-700'
            }`}
          >
            {label}
          </p>
          {description && (
            <p className="text-[11px] text-gray-400 mt-0.5 leading-4">
              {description}
            </p>
          )}
        </div>
      </div>
      {value && (
        <span
          className={`text-[11px] font-medium truncate max-w-[150px] ${
            danger ? 'text-red-400' : 'text-gray-400'
          }`}
        >
          {value}
        </span>
      )}
    </>
  );

  const classes =
    'w-full flex items-center justify-between gap-3 py-3 transition-colors text-right';

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setPasswordModal] = useState(false);
  const [showAddressModal, setAddressModal] = useState(false);
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

  const addressValue = [user?.data?.city?.name, user?.data?.province?.name]
    .filter(Boolean)
    .join('، ');

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-800 pt-1">پروفایل من</h1>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="flex justify-end mb-4">
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full" />
            <div className="h-4 w-32 bg-gray-100 rounded mt-3" />
            <div className="h-3 w-24 bg-gray-100 rounded mt-2" />
          </div>
        </div>
      ) : (
        <ProfileCard user={user?.data} onEdit={() => setShowEditModal(true)} />
      )}

      {/* اطلاعات حساب و امنیت */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <SectionHeader
          icon={<ShieldCheck size={17} />}
          title="اطلاعات حساب و امنیت"
        />
        <div className="divide-y divide-gray-100">
          <RowAction
            icon={<UserRound size={15} />}
            label="تغییر نام"
            value={user?.data?.fullName || '—'}
            onClick={() => setShowEditModal(true)}
          />
          <RowAction
            icon={<Phone size={15} />}
            label="تغییر شماره موبایل"
            value={user?.data?.phone || '—'}
            onClick={() => setShowEditModal(true)}
          />
          <RowAction
            icon={<ShieldCheck size={15} />}
            label="تغییر رمز عبور"
            value="••••••"
            onClick={() => setPasswordModal(true)}
          />
          <RowAction
            icon={<MapPin size={15} />}
            label="تغییر آدرس"
            value={addressValue || 'ثبت نشده'}
            onClick={() => setAddressModal(true)}
          />
          <RowAction
            icon={<LogOut size={15} />}
            label="خروج از حساب"
            onClick={logout}
            danger
          />
        </div>
      </div>

      {/* راهنما، حریم خصوصی و پشتیبانی */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <SectionHeader
          icon={<Headphones size={17} />}
          title="راهنما، حریم خصوصی و پشتیبانی"
        />
        <div className="divide-y divide-gray-100">
          <RowAction
            icon={<FileText size={15} />}
            label="مشاهده حریم خصوصی"
            description="اطلاعات شخصی شما با شخص ثالث به اشتراک گذاشته نمی‌شود."
            href="/privacy"
          />
          <RowAction
            icon={<ScrollText size={15} />}
            label="قوانین استفاده"
            description="لطفاً قوانین و شرایط استفاده را مطالعه و تأیید کنید."
            href="/terms"
          />
          <RowAction
            icon={<MessageSquareWarning size={15} />}
            label="گزارش مشکل"
            description="صدای شما برای ما مهم است."
            href="/support"
          />
          <RowAction
            icon={<ThumbsUp size={15} />}
            label="بازخورد و پیشنهاد"
            description="بازخورد شما به بهبود منشیم کمک می‌کند."
            onClick={() => setShowFeedbackModal(true)}
          />
        </div>
      </div>

      {/* CTA پشتیبانی */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-red-600 text-center mb-3">
          سؤالی دارید؟ با پشتیبانی تماس بگیرید
        </p>
        <Link href="/support">
          <Button
            className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white"
            size="lg"
          >
            <Send size={15} />
            تماس با پشتیبانی
          </Button>
        </Link>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        نسخه ۱.۳.۰ | توسعه داده شده با ❤️
      </div>

      <EditProfileModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        user={user ? { data: user.data } : undefined}
      />
      <ChangePasswordModal
        open={showPasswordModal}
        onOpenChange={setPasswordModal}
      />
      <AddressModal
        open={showAddressModal}
        onOpenChange={setAddressModal}
        user={user?.data}
      />

      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />
    </div>
  );
}
