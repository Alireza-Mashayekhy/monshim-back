'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { useHydrated } from '@/hooks/use-hydrated';
import { getApiErrorMessage } from '@/lib/api-error';
import { authKeys } from '@/lib/auth';
import { cn } from '@/lib/utils';
import QueryProvider from '@/providers/query-provider';
import { fetchMe } from '@/services/features/auth/api';

import BookingAuthDialog from './booking-auth-dialog';

type BookingContextValue = {
  checking: boolean;
  startBooking: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

function BookingGateContent({
  bookingUrl,
  salonName,
  children,
}: {
  bookingUrl: string;
  salonName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const startBooking = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      // Always verify the current cookie on click. A refresh-only session is
      // restored by the API interceptor; a network/server error is not a guest.
      const result = await queryClient.fetchQuery({
        queryKey: authKeys.me,
        queryFn: ({ signal }) => fetchMe(signal),
        staleTime: 0,
        retry: false,
      });
      if (result.data) router.push(bookingUrl);
      else setOpen(true);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'بررسی حساب انجام نشد. لطفاً دوباره تلاش کنید.',
        ),
      );
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };

  return (
    <BookingContext.Provider
      value={{ checking, startBooking: () => void startBooking() }}
    >
      {children}
      {open && (
        <BookingAuthDialog
          open={open}
          onOpenChange={setOpen}
          salonName={salonName}
          onComplete={() => {
            setOpen(false);
            router.push(bookingUrl);
          }}
        />
      )}
    </BookingContext.Provider>
  );
}

/** Keep the public page server-rendered; only booking actions need a query client. */
export default function BookingGate(props: {
  bookingUrl: string;
  salonName: string;
  children: ReactNode;
}) {
  return (
    <QueryProvider>
      <BookingGateContent {...props} />
    </QueryProvider>
  );
}

export function BookingTrigger({
  children,
  className,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  const booking = useContext(BookingContext);
  const hydrated = useHydrated();
  if (!booking) throw new Error('BookingTrigger requires BookingGate');
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer disabled:cursor-wait disabled:opacity-70',
        className,
      )}
      disabled={!hydrated || booking.checking}
      aria-label={ariaLabel}
      aria-busy={!hydrated || booking.checking}
      onClick={booking.startBooking}
    >
      {children}
    </button>
  );
}
