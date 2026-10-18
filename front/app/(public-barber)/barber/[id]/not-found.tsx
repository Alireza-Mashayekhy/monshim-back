import { Scissors } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * وقتی صفحهٔ عمومیِ یک آرایشگر فعال نیست (نه پکیج خریده و نه به حد نصابِ
 * نوبت‌های پرداخت‌شده رسیده) یا اصلاً چنین آرایشگری وجود ندارد، این صفحه با
 * وضعیت ۴۰۴ نمایش داده می‌شود.
 */
export default function PublicBarberNotFound() {
  return (
    <div className="custom-container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary-2 text-primary">
        <Scissors size={28} />
      </div>
      <h1 className="text-xl font-black text-gray-900">
        این صفحهٔ آرایشگاه در دسترس نیست
      </h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        صفحهٔ اختصاصی این آرایشگاه فعال نیست یا نشانی واردشده اشتباه است. برای
        پیدا کردن آرایشگاه مورد نظرتان وارد حساب کاربری خود شوید و از بخش
        جست‌وجو استفاده کنید.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/panel/explore">جست‌وجوی آرایشگاه‌ها</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">صفحهٔ اصلی</Link>
        </Button>
      </div>
    </div>
  );
}
