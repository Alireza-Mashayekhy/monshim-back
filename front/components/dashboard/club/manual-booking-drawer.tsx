'use client';

import { ManualBookingDrawer as AppointmentsManualBookingDrawer } from '@/components/dashboard/appointments/manual-booking-drawer';
import type { ClubCustomer } from '@/services/features/club/types';

interface ManualBookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ClubCustomer | null;
}

export function ManualBookingDrawer({
  open,
  onOpenChange,
  customer,
}: ManualBookingDrawerProps) {
  return (
    <AppointmentsManualBookingDrawer
      open={open}
      onOpenChange={onOpenChange}
      fixedCustomer={customer}
    />
  );
}
