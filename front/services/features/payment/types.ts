export interface InitiatePaymentResponse {
  trackId: number;
  paymentUrl: string;
  orderId: string;
  amount: number;
  planName?: string;
  bookingId?: string;
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
  purpose: 'SUBSCRIPTION' | 'BOOKING' | 'WALLET';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
  refNumber: string | null;
  cardNumber: string | null;
  paidAt: string | null;
  createdAt: string;
}
