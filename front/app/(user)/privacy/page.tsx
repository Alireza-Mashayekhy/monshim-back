import { ShieldCheck } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سیاست حریم خصوصی | منشیم',
  description: 'سیاست حریم خصوصی سامانه نوبت‌دهی منشیم',
};

export default function PrivacyPage() {
  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">سیاست حریم خصوصی</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-2/60 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck size={17} />
          </div>
          <p className="text-xs text-gray-500 leading-5">
            در منشیم، حفاظت از اطلاعات شخصی شما اولویت اصلی ماست. این سیاست
            توضیح می‌دهد که چه اطلاعاتی جمع‌آوری می‌شود و چگونه از آن‌ها استفاده
            می‌شود.
          </p>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              اطلاعاتی که جمع‌آوری می‌کنیم
            </h2>
            <ul className="text-xs text-gray-500 leading-6 list-disc pr-4 space-y-1">
              <li>نام و نام خانوادگی و شماره موبایل (در زمان ثبت‌نام)</li>
              <li>تاریخ تولد و شهر محل سکونت (اختیاری)</li>
              <li>سوابق رزروهای شما در منشیم</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              استفاده از اطلاعات
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              اطلاعات شما فقط برای ارائه بهتر خدمات، هماهنگی نوبت‌ها،
              اطلاع‌رسانی و بهبود تجربه کاربری به کار می‌رود. اطلاعات شخصی شما
              با شخص ثالث به اشتراک گذاشته نمی‌شود.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              امنیت داده‌ها
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              ارتباطات شما با رمزنگاری محافظت می‌شود و رمز عبور شما به‌صورت
              هش‌شده و امن در سیستم‌های ما نگهداری می‌شود.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-black text-gray-900 mb-1.5">
              مدیریت اطلاعات
            </h2>
            <p className="text-xs text-gray-500 leading-6">
              شما همواره می‌توانید از بخش پروفایل، اطلاعات خود را ویرایش کنید و
              در صورت نیاز، برای حذف یا اصلاح اطلاعات با پشتیبانی منشیم در
              ارتباط باشید.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
