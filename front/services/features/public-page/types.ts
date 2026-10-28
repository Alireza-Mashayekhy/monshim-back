import type { Barber } from '@/services/features/barber/types';

/** دلیل فعال‌بودن صفحهٔ عمومی: خرید پکیج یا رسیدن به حد نصاب رزروهای موفق */
export type PublicPageActivationReason = 'PACKAGE' | 'PAID_BOOKINGS';

export interface PublicPageStatus {
  isActive: boolean;
  reason: PublicPageActivationReason | null;
  /** تعداد رزروهای موفقی که پرداخت آن‌ها در درگاه انجام شده و لغو/برگشت نشده‌اند */
  paidBookingsCount: number;
  /** حد نصاب رزروهای موفق برای فعال‌سازی بدون خرید پکیج */
  requiredPaidBookings: number;
  /** قیمت پکیج صفحهٔ عمومی به تومان */
  packagePriceTomans: number;
  /** زمان خرید پکیج (در صورت خرید) */
  purchasedAt: string | null;
  /** اسلاگ اختصاصی ثبت‌شده برای آدرس عمومی سالن */
  slug: string | null;
  /**
   * آیا اسلاگ قفل شده است؟ اسلاگ فقط **یک بار** قابل ثبت است و پس از ثبت
   * (به‌دلیل حفظ سئو) از پنل قابل تغییر نیست.
   */
  isSlugLocked: boolean;
  /** آدرس عمومی صفحهٔ آرایشگاه (فقط پس از ثبت اسلاگ) */
  publicUrl: string | null;
  /** آیا پروفایل آرایشگر تایید شده است؟ (بدون تایید، صفحه عمومی نمایش داده نمی‌شود) */
  isApproved: boolean;
}

export interface PublicPageDiscountQuote {
  code: string;
  percentOff: number;
  originalAmount: number;
  discountAmount: number;
  amount: number;
}

export interface SlugAvailabilityResult {
  slug: string;
  valid: boolean;
  available: boolean;
  isCurrentUser: boolean;
  reason: string;
}

export interface PublicBarberProfile extends Barber {
  slug: string | null;
  publicPage: {
    isActive: boolean;
    reason: PublicPageActivationReason | null;
    slug: string;
    url: string;
  };
}

export interface PublicPageDirectoryEntry {
  id: number;
  slug: string;
  updatedAt: string | null;
}
