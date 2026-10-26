export interface InitiatePaymentResponse {
  trackId: number;
  paymentUrl: string;
  orderId: string;
  amount: number;
  planName?: string;
  bookingId?: string;
  depositAmount?: number;
  commissionAmount?: number;
}

export interface InitiateSubscriptionPaymentDto {
  subscriptionPlanId: string;
}

export interface InitiateBookingPaymentDto {
  barberId: number | string;
  serviceId?: string;
  serviceIds?: string[];
  date: string;
  time: string;
  note?: string;
}

export interface ChargeWalletDto {
  amount: number;
}

export interface PaymentStatusResponse {
  id: string;
  userId: number;
  amount: number;
  trackId: number;
  orderId: string;
  purpose: 'SUBSCRIPTION' | 'BOOKING' | 'WALLET' | 'PUBLIC_PAGE';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
  refNumber: string | null;
  cardNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DepositInvoiceItem {
  bookingId: string;
  serviceId: string;
  name: string;
  time: string;
  durationMinutes: number;
  price: number;
  depositPrice: number | null;
  hasDeposit: boolean;
  payableAmount: number;
  remainingInSalon: number;
}

export interface DepositInvoiceResponse {
  token: string;
  status: 'payable' | 'paid' | 'canceled' | 'expired';
  statusReason: string | null;
  canceledBy: 'customer' | 'barber' | 'admin' | 'system' | null;
  salon: {
    id: string;
    userId: number | null;
    name: string;
    address: string | null;
    cityName: string | null;
    profileImage: string | null;
    phone: string | null;
  };
  customer: {
    fullName: string;
    maskedPhone: string | null;
  };
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    totalDurationMinutes: number;
    customerNote: string | null;
    depositRequestedAt: string | null;
    expiresAt: string | null;
    timeoutHours: number;
  };
  items: DepositInvoiceItem[];
  pricing: {
    totalServicePrice: number;
    depositAmount: number;
    maxPayableAmount: number;
    commissionMode?: 'tiered' | 'flat';
    commissionPercent: number;
    commissionAmount: number;
    commissionMaxAmount?: number | null;
    isCommissionCapped?: boolean;
    remainingInSalon: number;
    amountToPay: number;
  };
  receipt: {
    paidAt: string;
    amount: number;
    trackId: number | null;
    refNumber: string | null;
  } | null;
}
