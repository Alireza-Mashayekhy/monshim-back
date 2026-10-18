export type PublicPageActivationReason = 'package' | 'deposits';

export interface PublicPageStatus {
  /** آیا صفحهٔ عمومی فعال است */
  active: boolean;
  /** علت فعالیت: خرید پکیج یا رزروهای بیعانه‌دار */
  reason: PublicPageActivationReason | null;
  /** آیا پکیج صفحه عمومی خریده شده */
  purchased: boolean;
  purchasedAt: string | null;
  /** تعداد رزروهای فعال با بیعانه */
  depositBookingsCount: number;
  requiredDepositBookings: number;
  packagePrice: number;
  /** نشانی صفحهٔ عمومی در صورت فعال بودن */
  publicUrl: string | null;
}

export interface PublicPagePaymentResponse {
  trackId: number;
  paymentUrl: string;
  orderId: string;
  amount: number;
}
