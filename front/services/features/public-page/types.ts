import type { Barber } from '@/services/features/barber/types';

/** دلیل فعال‌بودن صفحهٔ عمومی: خرید پکیج یا رسیدن به حد نصاب نوبت‌ها */
export type PublicPageActivationReason = 'PACKAGE' | 'PAID_BOOKINGS';

export interface PublicPageStatus {
  isActive: boolean;
  reason: PublicPageActivationReason | null;
  /** تعداد نوبت‌هایی که بیعانه یا کل مبلغ‌شان پرداخت شده است */
  paidBookingsCount: number;
  /** حد نصاب نوبت‌های پرداخت‌شده برای فعال‌سازی بدون خرید پکیج */
  requiredPaidBookings: number;
  /** قیمت پکیج صفحهٔ عمومی به تومان */
  packagePriceTomans: number;
  /** زمان خرید پکیج (در صورت خرید) */
  purchasedAt: string | null;
  /** آدرس عمومی صفحهٔ آرایشگاه */
  publicUrl: string;
  /** آیا پروفایل آرایشگر تایید شده است؟ (بدون تایید، صفحه عمومی نمایش داده نمی‌شود) */
  isApproved: boolean;
}

export interface PublicBarberProfile extends Barber {
  publicPage: {
    isActive: boolean;
    reason: PublicPageActivationReason | null;
    url: string;
  };
}

export interface PublicPageDirectoryEntry {
  id: number;
  updatedAt: string | null;
}
