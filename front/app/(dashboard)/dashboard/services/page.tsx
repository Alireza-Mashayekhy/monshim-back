// app/(dashboard)/services/page.tsx
'use client';

import { Banknote, Clock, Edit, Plus, Scissors, Trash2 } from 'lucide-react';
import { useState } from 'react';

import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import { ServiceModal } from '@/components/dashboard/services/services-modal';
import AppCard from '@/components/shared/app-card';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import {
  useDeleteService,
  useMyServices,
} from '@/services/features/services/hooks';

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const { data: services, isLoading, error } = useMyServices();
  const deleteMutation = useDeleteService();

  const handleDelete = (serviceId: number) => {
    if (window.confirm('آیا از حذف این خدمت اطمینان دارید؟')) {
      deleteMutation.mutate(serviceId);
    }
  };

  const openModal = (service?: any) => {
    setEditingService(service || null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">مدیریت خدمات</h2>
            <p className="text-sm text-gray-500">در حال بارگذاری...</p>
          </div>
          <Button disabled className="gap-2">
            <Plus size={16} /> افزودن
          </Button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <AppCard key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-3 mt-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <Skeleton className="w-9 h-9 rounded-lg" />
              </div>
            </AppCard>
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="text-center py-10 text-red-500">
          خطا در بارگذاری اطلاعات:{' '}
          {(error as any)?.message || 'لطفاً مجدداً تلاش کنید'}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">مدیریت خدمات</h2>
            <p className="text-sm text-gray-500">
              {services?.data?.length} خدمت فعال
            </p>
          </div>
          <Button onClick={() => openModal()} className="gap-2">
            <Plus size={16} /> افزودن
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-3">
          {services?.data?.map(service => (
            <AppCard
              key={service.id}
              className="flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-200">
                  <Scissors size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {service.name}
                  </h4>
                  <div className="flex gap-3 text-xs text-gray-500 mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {service.durationMinutes} دقیقه
                    </span>
                    <span className="flex items-center gap-1 text-primary-700 font-bold">
                      <Banknote size={12} /> {formatPrice(service.price)}
                    </span>
                  </div>
                  {service.depositPrice && (
                    <div className="text-xs text-amber-600 font-semibold">
                      بیعانه: {formatPrice(service.depositPrice)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-600 hover:bg-blue-50"
                  onClick={() => openModal(service)}
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => handleDelete(Number(service.id))}
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === Number(service.id)
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </AppCard>
          ))}
          {services?.data?.length === 0 && (
            <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              هیچ خدمتی ثبت نشده است. اولین خدمت را اضافه کنید!
            </p>
          )}
        </div>
      </FadeIn>

      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingService={editingService}
      />
    </DashboardShell>
  );
}
