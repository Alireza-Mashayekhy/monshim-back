// app/(dashboard)/appointments/page.tsx
'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';

import { AppointmentBookingDialog } from '@/components/dashboard/appointments/appointment-booking-dialog';
import AppointmentFilter from '@/components/dashboard/appointments/appointment-filter';
import AppointmentList from '@/components/dashboard/appointments/appointment-list';
import AppointmentSearch from '@/components/dashboard/appointments/appointment-search';
import AppointmentSummary from '@/components/dashboard/appointments/appointment-summary';
import DashboardShell from '@/components/dashboard/layout/dashboard-shell';
import FadeIn from '@/components/shared/fade-in';
import { Button } from '@/components/ui/button';

export default function AppointmentsPage() {
  const [filter, setFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <DashboardShell>
      <FadeIn>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-lg font-bold text-gray-800">نوبت‌ها</h2>
          <Button
            onClick={() => setBookingOpen(true)}
            className="gap-2 rounded-xl"
          >
            <CalendarPlus size={16} />
            ثبت نوبت دستی
          </Button>
        </div>
        <AppointmentSummary />
      </FadeIn>

      <FadeIn delay={0.1}>
        <AppointmentFilter onFilterChange={setFilter} initialFilter={filter} />
      </FadeIn>

      <FadeIn delay={0.15}>
        <AppointmentSearch onSearch={setSearch} value={search} />
      </FadeIn>

      <FadeIn delay={0.2}>
        <AppointmentList filter={filter} search={search} />
      </FadeIn>

      <AppointmentBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </DashboardShell>
  );
}
